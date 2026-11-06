import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 20261106000300 (docs/19 «Evolution driver»): expand-only, no row switched.

const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261106000300_evolution_driver.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('migration: the Evolution driver', () => {
  it('widens the provider check and ties the engine to the provider', () => {
    expect(code).toContain("check (provider in ('meta', 'kapso', 'crm', 'evolution')) not valid");
    expect(code).toContain("check ((provider = 'evolution') = (evolution_mode is not null))");
    expect(code).toContain('evolution_auto_sends boolean not null default false');
  });

  it('lists every shared secret key, EVOLUTION_API_KEY included, service role only', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(code)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
    expect(code).toContain('grant execute on function public.integration_secret_key_ok(text) to service_role;');
  });

  it('accepts the evolution_token number secret and switches no row (no update / insert)', () => {
    expect(code).toContain("array['access_token', 'app_secret', 'evolution_token']");
    expect(code).not.toMatch(/^\s*(update|insert|delete)\b/im);
  });
});
