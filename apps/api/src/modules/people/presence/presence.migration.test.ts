import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 985 (docs/33 §5), read as text: no database in unit tests.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261030000985_presence.sql'), 'utf8');
const code = sql
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

describe('migration 985: presence', () => {
  it('profile_presence: UTC timestamptz, RLS on, no policy, no client grant', () => {
    expect(code).toContain('create table if not exists public.profile_presence');
    expect(code).toContain('last_seen_at timestamptz not null');
    expect(code).toContain('alter table public.profile_presence enable row level security;');
    expect(code).toContain('revoke all on public.profile_presence from anon, authenticated;');
    expect(code).not.toMatch(/create policy \w+ on public\.profile_presence/);
  });

  it('the touch is service-role only and skips a write under a minute old', () => {
    expect(code).toContain(
      'revoke execute on function public.presence_touch(uuid[]) from public, anon, authenticated;',
    );
    expect(code).toContain("where pp.last_seen_at < excluded.last_seen_at - interval '1 minute'");
  });

  it('the switch defaults to on when unset (the seeder stores JSON null)', () => {
    expect(code).toMatch(/s\.key = 'presence_enabled'[\s\S]*\), true\)/);
  });

  it("Realtime: track only on one's own topic, watch only what presence_can_watch allows", () => {
    expect(code).toMatch(
      /presence_track on realtime\.messages for insert[\s\S]*= \(select auth\.uid\(\)\)/,
    );
    expect(code).toMatch(
      /presence_watch on realtime\.messages for select[\s\S]*presence_can_watch/,
    );
    expect(code).toContain("realtime.messages.extension = 'presence'");
    expect(code).toContain("if to_regclass('realtime.messages') is null then");
  });

  it('the watch rule mirrors maySeePresence: family → teacher, teacher/sales → family, admin all', () => {
    expect(code).toContain("public.auth_role() in ('teacher', 'sales')");
    expect(code).toContain("public.auth_role() in ('guardian', 'student')");
    expect(code).toContain('or public.is_admin()');
    expect(code.match(/public\.can_read_channel\(c\.id\)/g)).toHaveLength(2);
  });

  it('is expand only and idempotent: no drop of data, no insert of rows', () => {
    expect(code).not.toMatch(/drop table|drop column|delete from|truncate/i);
    expect(code).not.toMatch(/insert into public\.(settings|profiles)/);
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
