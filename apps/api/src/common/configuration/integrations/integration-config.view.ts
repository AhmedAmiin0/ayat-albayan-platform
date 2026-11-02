import { INTEGRATION_KEYS, type IntegrationConfigItem } from '@ab/shared';
import { integrationKeyAvailable } from '@/config/env/env.stripe';
import type { PlainRow, SecretStatus } from './integration-config.repo';

interface ViewInput {
  plain: readonly PlainRow[];
  secrets: readonly SecretStatus[];
  /** The server env (raw strings), the fallback. */
  env: NodeJS.ProcessEnv;
}

const nonBlank = (v: string | undefined): string | null => (v !== undefined && v.trim() !== '' ? v.trim() : null);

/**
 * GET /settings/integrations: every registry key with where its value comes from. A secret is only
 * ever `set` / `source`: its value (from Vault OR env) is never put in the view. The Stripe group
 * is listed only where the module exists (FEATURE_STRIPE test or live, docs/30), nowhere else.
 */
export function integrationItems({ plain, secrets, env }: ViewInput): IntegrationConfigItem[] {
  const keys = INTEGRATION_KEYS.filter((d) => integrationKeyAvailable(d.key, env));
  return keys.map(({ key, group, secret }) => {
    const plainRow = secret ? undefined : plain.find((p) => p.key === key && nonBlank(p.value) !== null);
    const row = secret ? secrets.find((s) => s.key === key) : plainRow;
    const fromEnv = nonBlank(env[key]);
    const source = row ? 'db' : fromEnv !== null ? 'env' : 'unset';
    return {
      key,
      group,
      secret,
      value: secret ? null : plainRow ? nonBlank(plainRow.value) : fromEnv,
      set: source !== 'unset',
      source,
      updated_at: row ? row.updated_at : null,
    };
  });
}
