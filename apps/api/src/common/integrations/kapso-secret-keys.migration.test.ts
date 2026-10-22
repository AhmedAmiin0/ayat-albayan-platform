import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 450 (docs/19): the Kapso secrets join the Vault allow-list. No database in unit tests.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const FILE = '20261017000450_kapso_secret_keys.sql';
const sql = readFileSync(join(dir, FILE), 'utf8');

describe('migration 450: Kapso secret keys', () => {
  it('integration_secret_key_ok lists exactly the shared secret keys, Kapso included', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    // The Google client secret came later (migration 530, google-sync.migration.test.ts).
    expect(listed.sort()).toEqual(INTEGRATION_SECRET_KEYS.filter((k) => !k.startsWith('GOOGLE_')).sort());
    expect(listed).toEqual(expect.arrayContaining(['KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET']));
  });

  it('keeps the function service-role only and re-runnable', () => {
    expect(sql).toContain('create or replace function public.integration_secret_key_ok(p_key text)');
    expect(sql).toContain('revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.integration_secret_key_ok(text) to service_role;');
  });
});
