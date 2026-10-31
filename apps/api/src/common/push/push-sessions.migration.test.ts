import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 700 (owner 2026-10-25: notifications only to authenticated, authorized people). No
// database runs in unit tests: this pins its shape.
const dir = MIGRATIONS_DIR;
const sql = readFileSync(join(dir, '20261025000700_push_sessions.sql'), 'utf8');
const code = sql
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('--'))
  .join('\n');

describe('migration 700: push bound to auth sessions', () => {
  it('push_device_sessions: RLS on, own read only, client writes revoked, cascades from the session', () => {
    expect(code).toContain('create table if not exists public.push_device_sessions');
    expect(code).toContain('session_id uuid not null references auth.sessions (id) on delete cascade');
    expect(code).toContain('profile_id uuid not null references public.profiles (id) on delete cascade');
    expect(code).toContain('alter table public.push_device_sessions enable row level security;');
    expect(code).toContain('revoke all on public.push_device_sessions from anon;');
    expect(code).toMatch(/revoke insert, update, delete, truncate, references, trigger on public\.push_device_sessions\s+from authenticated;/);
    expect(code).toContain('using (profile_id = (select auth.uid()));');
  });

  it('web_push_subscriptions.session_id cascades from the session; expand-only and re-runnable', () => {
    expect(code).toMatch(/add column if not exists session_id uuid references auth\.sessions \(id\) on delete cascade;/);
    expect(code).not.toMatch(/\bdrop (table|column)\b/i);
    expect(code).not.toMatch(/create (table|index) (?!if not exists)/i);
    expect(code.match(/drop trigger if exists/g)?.length).toBe(code.match(/create trigger/g)?.length);
  });

  it('a binding gone or moved releases its token from the old profile', () => {
    expect(code).toContain('array_remove(push_tokens, old.token)');
    expect(code).toMatch(/after delete or update of profile_id\s+on public\.push_device_sessions/);
  });

  it('profiles.push_tokens: clients (authenticated / anon) cannot write it, even an admin', () => {
    expect(code).toContain("current_user in ('authenticated', 'anon')");
    expect(code).toContain('before update of push_tokens on public.profiles');
  });

  it('disabled or another role: every token and browser revoked', () => {
    expect(code).toContain('after update of disabled_at, role, role_id on public.profiles');
    expect(code).toContain('delete from public.web_push_subscriptions where profile_id = new.id;');
    expect(code).toContain("update public.profiles set push_tokens = '{}' where id = new.id");
  });

  it('push_live_sessions / revoke_other_user_sessions: definer with an empty search_path, service role only', () => {
    expect(code).toContain('(s.not_after is null or s.not_after > now())');
    expect(code).toContain('u.deleted_at is null');
    for (const fn of ['push_live_sessions(uuid[])', 'revoke_other_user_sessions(uuid, uuid)']) {
      expect(code).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
      expect(code).toContain(`grant execute on function public.${fn} to service_role;`);
    }
    expect(code.match(/security definer set search_path = ''/g)).toHaveLength(4);
  });
});
