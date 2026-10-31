import { INTEGRATION_KEYS, type IntegrationConfigItem } from '@ab/shared';
import type { PlainRow, SecretStatus } from './integration-config.queries';

interface ViewInput {
  plain: readonly PlainRow[];
  secrets: readonly SecretStatus[];
  /** The server env (raw strings), the fallback. */
  env: NodeJS.ProcessEnv;
}

const nonBlank = (v: string | undefined): string | null => (v !== undefined && v.trim() !== '' ? v.trim() : null);

/**
 * GET /settings/integrations: every registry key with where its value comes from. A secret is only
 * ever `set` / `source`: its value (from Vault OR env) is never put in the view.
 */
export function integrationItems({ plain, secrets, env }: ViewInput): IntegrationConfigItem[] {
  return INTEGRATION_KEYS.map(({ key, group, secret }) => {
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
