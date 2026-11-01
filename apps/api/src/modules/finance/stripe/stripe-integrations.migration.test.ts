import { readFileSync } from 'node:fs';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 996 (Stripe in «التكاملات», docs/30), read as text: no database in unit tests.
const sql = readFileSync(migrationPath('20261101000996_stripe_integrations.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('migration 996: the Stripe keys move to the integration config', () => {
  it('integration_secret_key_ok lists every shared secret key, the two Stripe ones included', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
    expect(listed).toEqual(expect.arrayContaining(['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET']));
    expect(code).toContain('grant execute on function public.integration_secret_key_ok(text) to service_role;');
  });

  it('copies the old Vault secrets inside the database, of the right shape, once', () => {
    expect(code).toContain("('stripe:api_key', 'STRIPE_API_KEY', '^(rk|sk)_test_[A-Za-z0-9]+$')");
    expect(code).toContain("('stripe:webhook_secret', 'STRIPE_WEBHOOK_SECRET', '^whsec_[A-Za-z0-9+/=]+$')");
    expect(code).toContain('join vault.decrypted_secrets s on s.name = v.old_name');
    expect(code).toContain("and not exists (select 1 from vault.secrets t where t.name = 'integration:' || v.new_key)");
    expect(code).toContain("perform vault.create_secret(btrim(m.value), 'integration:' || m.new_key,");
    const copy = /do \$\$[\s\S]*?\$\$;/.exec(code)?.[0] ?? '';
    expect(copy).toContain('vault.create_secret');
    expect(copy).not.toMatch(/raise|notice|return/i);
  });

  it('copies the switch and the cap without overwriting a value saved in «التكاملات»', () => {
    expect(code).toMatch(/select 'STRIPE_ENABLED', s\.stripe_enabled::text from public\.stripe_settings s where s\.id\s+on conflict \(key\) do nothing;/);
    expect(code).toMatch(/select 'STRIPE_MAX_DISCOUNT_PCT', s\.max_discount_pct::text[\s\S]*?on conflict \(key\) do nothing;/);
  });

  it('expand-only: keeps the old secrets, functions and columns for a later cleanup', () => {
    expect(code).not.toMatch(/\b(drop|delete|truncate)\b/i);
    expect(code).not.toMatch(/vault\.update_secret|stripe_secret_clear/);
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
