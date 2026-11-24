import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 932 (owner 2026-10-28): subscriptions.lessons_used_before, counted in v_subscription_balance.
const dir = MIGRATIONS_DIR;
const code = (name: string) => readFileSync(join(dir, name), 'utf8').replace(/--.*$/gm, '');
const sql = code('20261028000932_lessons_used_before.sql');
const viewOf = (text: string) => text.slice(text.indexOf('create or replace view public.v_subscription_balance'));
const columns = (text: string) => {
  const select = viewOf(text).split(/\n {2}select /)[1] ?? '';
  return [...select.matchAll(/ as (\w+)|\bb\.(\w+),/g)].map((m) => m[1] ?? m[2]);
};

describe('migration 20261028000932 lessons_used_before', () => {
  it('a smallint column, 0 by default, never the whole package', () => {
    expect(sql).toMatch(/add column lessons_used_before smallint not null default 0/);
    expect(sql).toMatch(/check \(lessons_used_before >= 0 and lessons_used_before < lessons_total\)/);
  });

  it('lessons_used includes lessons_used_before; the capacity excludes it', () => {
    expect(sql).toMatch(/subs\.before \+\s+case when subs\.is_last/);
    expect(sql).toMatch(/sum\(s\.lessons_total - s\.lessons_used_before\)\s+over \(w rows between unbounded preceding and 1 preceding\)/);
    expect(sql).toMatch(/sum\(s\.lessons_total - s\.lessons_used_before\)\s+over \(w rows between unbounded preceding and current row\)/);
    expect(sql).toMatch(/b\.lessons_total - b\.used as remaining/);
  });

  it('keeps every column of migration 190 in order, appends lessons_used_before', () => {
    const before = columns(code('20261001000190_room_open_instant.sql'));
    const after = columns(sql);
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.at(-1)).toBe('lessons_used_before');
  });

  it('security_invoker and the grants of migration 123 (service role only)', () => {
    expect(sql).toMatch(/create or replace view public\.v_subscription_balance with \(security_invoker = true\)/);
    expect(sql).toContain('revoke all on public.v_subscription_balance from anon, authenticated;');
    expect(sql).toContain('grant select on public.v_subscription_balance to service_role;');
  });
});
