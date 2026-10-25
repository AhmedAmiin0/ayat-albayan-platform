import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 720 (review of #172, PR #175): no push-token takeover. No database runs in unit tests:
// this pins its shape.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261025000720_push_token_takeover.sql'), 'utf8');
const code = sql
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('--'))
  .join('\n');

describe('migration 720: no push-token takeover', () => {
  it('push_device_sessions.device_key_hash: a sha256 hex, added re-runnably', () => {
    expect(code).toContain("add column if not exists device_key_hash text check (device_key_hash ~ '^[0-9a-f]{64}$')");
  });

  it('profiles: table SELECT revoked from clients, every column but push_tokens granted back', () => {
    expect(code).toContain('revoke select on public.profiles from anon, authenticated;');
    expect(code).toContain("column_name <> 'push_tokens'");
    expect(code).toContain("grant select (%s) on public.profiles to anon, authenticated");
    expect(code.indexOf('revoke select on public.profiles')).toBeLessThan(code.indexOf('grant select (%s)'));
  });

  it('expand-only: nothing dropped, no write privilege granted to clients', () => {
    expect(code).not.toMatch(/\bdrop (table|column|policy|function)\b/i);
    expect(code).not.toMatch(/grant (insert|update|delete|all)/i);
  });
});
