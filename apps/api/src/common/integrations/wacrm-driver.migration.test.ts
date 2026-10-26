import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 640 (docs/19 «crm driver»), read as text: no database in unit tests.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const FILE = '20261025000640_wacrm_driver.sql';
const sql = readFileSync(join(dir, FILE), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('migration 640: the crm driver', () => {
  it('is followed by the calls migration (740) as the latest integration_secret_key_ok', () => {
    const defines = (f: string) => /function public\.integration_secret_key_ok\(/.test(readFileSync(join(dir, f), 'utf8'));
    const defining = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().filter(defines);
    expect(defining.slice(-2)).toEqual([FILE, '20261026000740_wa_calls.sql']);
  });

  it('integration_secret_key_ok lists the shared secret keys of its day, the two CRM keys included', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual(INTEGRATION_SECRET_KEYS.filter((k) => !k.startsWith('CALLS_')).sort());
    expect(listed).toEqual(expect.arrayContaining(['WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET']));
    expect(code).toContain('grant execute on function public.integration_secret_key_ok(text) to service_role;');
  });

  it('widens the wa_numbers provider check to crm, re-runnably, and writes no row', () => {
    expect(code).toContain('drop constraint if exists wa_numbers_provider_check');
    expect(code).toContain("check (provider in ('meta', 'kapso', 'crm'))");
    expect(code).not.toMatch(/\b(insert|update|delete)\b/i);
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
