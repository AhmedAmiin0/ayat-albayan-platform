import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CALL_DIRECTIONS, CALL_END_REASONS, CALL_STATUSES, INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 740 (docs/28), read as text: no database in unit tests.
const dir = MIGRATIONS_DIR;
const sql = readFileSync(join(dir, '20261026000740_wa_calls.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('migration 740: wa_calls', () => {
  it('checks hold exactly the shared enums', () => {
    const list = (col: string) => [...(new RegExp(`${col} in \\(([^)]*)\\)`).exec(code)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(list('direction')).toEqual([...CALL_DIRECTIONS]);
    expect(list('status')).toEqual([...CALL_STATUSES]);
    expect(list('end_reason')).toEqual([...CALL_END_REASONS]);
  });

  it('RLS on, read policies like messages (admin, teacher, sales), no client writes', () => {
    expect(code).toContain('alter table public.wa_calls enable row level security;');
    for (const p of ['wa_calls_admin_read', 'wa_calls_teacher_read', 'wa_calls_sales_read']) expect(code).toContain(`create policy ${p} on public.wa_calls for select to authenticated`);
    expect(code).toContain('revoke all on public.wa_calls from anon;');
    expect(code).toContain('revoke insert, update, delete, truncate, references, trigger on public.wa_calls from authenticated;');
  });

  it('the SDPs live in wa_call_sdp: RLS on, no client grant, never in the realtime publication', () => {
    expect(code).not.toMatch(/(offer|answer)_sdp[^\n]*\n[^]*create table if not exists public\.wa_call_sdp/);
    expect(code).toContain('alter table public.wa_call_sdp enable row level security;');
    expect(code).toContain('revoke all on public.wa_call_sdp from anon, authenticated;');
    expect(code).not.toMatch(/create policy \w+ on public\.wa_call_sdp/);
    expect(code).not.toMatch(/publication supabase_realtime add table public\.wa_call_sdp/);
  });

  it('unique keys make the request id and the wacid idempotent; the table joins the realtime publication', () => {
    expect(code).toContain('wa_calls_wa_call_id_key on public.wa_calls (wa_call_id)');
    expect(code).toContain('wa_calls_request_key on public.wa_calls (created_by, client_request_id)');
    expect(code).toContain('alter publication supabase_realtime add table public.wa_calls;');
  });

  it('expand-only: writes no row of any table and touches no setting', () => {
    expect(code).not.toMatch(/\b(insert into|update public|delete from)\b/i);
    expect(code).not.toMatch(/public\.settings/);
    expect(sql).toContain('MANUAL ROLLBACK');
  });

  it('holds the latest integration_secret_key_ok: every shared secret key, the TURN secret included', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
    expect(listed).toContain('CALLS_TURN_SECRET');
  });
});
