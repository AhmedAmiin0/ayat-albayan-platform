import { describe, expect, it } from 'vitest';
import { liveSqlObjects, settingsKeysOf, sqlSettingsReaders } from './sql-readers.js';

const m1 = `
create function public.f() returns int language sql as $$
  select coalesce((select (value #>> '{}')::int from public.settings where key = 'old_key'), 1);
$$;
create view public.v with (security_invoker = true) as
  select s.value from public.settings s where s.key in ('a_key', 'b_key');
create function public.other() returns int language sql as $fn$ select 1 from public.lessons where key = 'nope' $fn$;
`;
const m2 = `
-- create or replace function public.ghost() ... key = 'commented'
create or replace function public.f() returns int language plpgsql as $$
begin
  select value into stored from public.settings where key = 'new_key';
end;
$$;
drop view if exists public.v;
`;

describe('sql-readers (pure parsing of migration text)', () => {
  it('a later create or replace wins, a drop removes, comments are ignored', () => {
    const live = liveSqlObjects({ '2_b.sql': m2, '1_a.sql': m1 });
    expect([...live.keys()].sort()).toEqual(['public.f', 'public.other']);
    expect(live.get('public.f')?.body).toContain('new_key');
  });

  it('names keys by `key =` (any alias) and `key in (...)`, only next to public.settings', () => {
    expect(settingsKeysOf("from public.settings s where s.key in ('b', 'a_1') or key = 'c'")).toEqual(['a_1', 'b', 'c']);
    expect(settingsKeysOf("from public.lessons where key = 'x'")).toEqual([]);
    expect(settingsKeysOf("from public.settings where p_key = 'x'")).toEqual([]);
  });

  it('readers: live objects that read public.settings, with their keys', () => {
    expect(Object.fromEntries(sqlSettingsReaders({ '1_a.sql': m1 }))).toEqual({
      'public.f': ['old_key'],
      'public.v': ['a_key', 'b_key'],
    });
    expect(Object.fromEntries(sqlSettingsReaders({ '1_a.sql': m1, '2_b.sql': m2 }))).toEqual({ 'public.f': ['new_key'] });
  });
});
