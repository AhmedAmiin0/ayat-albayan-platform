import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 730 (review of #177): the takeover check in one locked statement. No database runs in
// unit tests: this pins its shape; e2e/tests/push-device-claim.sql.spec.ts runs it.
const dir = MIGRATIONS_DIR;
const sql = readFileSync(join(dir, '20261025000730_claim_push_device.sql'), 'utf8');
const code = sql
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('--'))
  .join('\n');

describe('migration 730: claim_push_device', () => {
  it('one lock per token, the row locked, a missing key never counts as proof', () => {
    expect(code).toContain("pg_advisory_xact_lock(hashtextextended('push_device:' || p_token, 0))");
    expect(code).toContain('for update;');
    expect(code).toContain('proven := coalesce(b.device_key_hash = p_presented, false);');
  });

  it('another profile’s live binding without proof: contested, never moved', () => {
    expect(code).toMatch(/b\.profile_id <> p_profile and not proven\s+and exists \(select 1 from public\.push_live_sessions/);
    expect(code).toContain("set contested_at = coalesce(contested_at, now())");
    expect(code).toContain("return 'in_use';");
  });

  it('definer with an empty search_path, service role only, re-runnable', () => {
    expect(code).toContain("security definer set search_path = ''");
    expect(code).toContain('create or replace function public.claim_push_device(');
    expect(code).toContain('revoke all on function public.claim_push_device(text, uuid, uuid, text, text) from public, anon, authenticated;');
    expect(code).toContain('grant execute on function public.claim_push_device(text, uuid, uuid, text, text) to service_role;');
    expect(code).not.toMatch(/\bdrop (table|column|function)\b/i);
  });
});

// The receipts job drops a binding made before the push its DeviceNotRegistered receipt is about:
// a device that registers the same token again must count as new from then on.
const reclaim = readFileSync(join(dir, '20261122000200_claim_push_device_created_at.sql'), 'utf8')
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('--'))
  .join('\n');
const body730 = code.slice(code.indexOf('create or replace'), code.indexOf('end $$;'));

describe('migration 20261122000200: a re-claim renews created_at', () => {
  it('the on conflict update sets created_at = now(), the rest of 730 unchanged', () => {
    expect(reclaim).toMatch(
      /on conflict \(token\) do update set [^;]*contested_at = null, created_at = now\(\);/,
    );
    expect(reclaim.replace(', created_at = now()', '')).toContain(body730);
  });

  it('a refused claim returns before the upsert; definer, grants and revokes as in 730', () => {
    expect(reclaim.indexOf("return 'in_use';")).toBeLessThan(reclaim.indexOf('on conflict'));
    expect(reclaim).toContain("security definer set search_path = ''");
    expect(reclaim).toContain('revoke all on function public.claim_push_device(text, uuid, uuid, text, text) from public, anon, authenticated;');
    expect(reclaim).toContain('grant execute on function public.claim_push_device(text, uuid, uuid, text, text) to service_role;');
    expect(reclaim).not.toMatch(/\bdrop\b/i);
  });
});
