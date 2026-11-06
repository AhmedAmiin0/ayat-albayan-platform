import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS, NUMBER_SECRET_NAMES } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 20261106000700 (docs/19 «Evolution driver»): expand-only, no row switched.

const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261106000700_evolution_driver.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
/** The statements outside function bodies ($$ … $$). */
const outside = code.split('$$').filter((_, i) => i % 2 === 0).join('\n');
const deleteFn = /function public\.wa_number_delete\(p_id uuid\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? '';

describe('migration: the Evolution driver', () => {
  it('widens the provider check and ties the engine to the provider', () => {
    expect(code).toContain("check (provider in ('meta', 'kapso', 'crm', 'evolution')) not valid");
    expect(code).toContain("check ((provider = 'evolution') = (evolution_mode is not null))");
    expect(code).toContain('evolution_auto_sends boolean not null default false');
    expect(code).toContain("evolution_config jsonb not null default '{}'::jsonb");
    expect(code).toContain("check (jsonb_typeof(evolution_config) = 'object')");
  });

  it('lists every shared secret key, EVOLUTION_API_KEY included, service role only', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(code)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
    expect(code).toContain('grant execute on function public.integration_secret_key_ok(text) to service_role;');
  });

  it('accepts every NUMBER_SECRET_NAMES secret and switches no row (no update / insert)', () => {
    const fn = /wa_number_secret_name_ok\(p_name text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(code)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...NUMBER_SECRET_NAMES].sort());
    for (const name of NUMBER_SECRET_NAMES) expect(code).toContain(`':${name}'`);
    expect(outside).not.toMatch(/^\s*(update|insert|delete)\b/im);
  });

  it('wa_number_delete removes every Vault entry of the number, service role only', () => {
    expect(deleteFn).toContain("delete from public.wa_numbers where id = p_id and not enabled;");
    const pattern = "name like 'wa_number:' || p_id::text || ':%'";
    expect(deleteFn).toContain(`delete from vault.secrets where ${pattern};`);
    // Every NUMBER_SECRET_NAMES entry is a wa_number:<id>:<name> name the pattern covers.
    // SQL LIKE 'wa_number:<id>:%' as a regex, against every name the number can hold.
    const id = '00000000-0000-4000-8000-000000000001';
    const like = new RegExp(`^wa_number:${id}:.*$`);
    for (const name of NUMBER_SECRET_NAMES) expect(like.test(`wa_number:${id}:${name}`)).toBe(true);
    expect(deleteFn).not.toContain('name in (');
    expect(code).toContain('revoke execute on function public.wa_number_delete(uuid) from public, anon, authenticated;');
    expect(code).toContain('grant execute on function public.wa_number_delete(uuid) to service_role;');
  });

  it('evolution_enabled_at is set on the off → on edge or a driver change while enabled', () => {
    expect(code).toContain('add column if not exists evolution_enabled_at timestamptz');
    const edge = "if new.enabled and (tg_op = 'INSERT' or not old.enabled or new.provider is distinct from old.provider)";
    expect(code).toContain(edge);
    expect(code).toContain('before insert or update of enabled, provider on public.wa_numbers');
  });
});
