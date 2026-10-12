import { INTEGRATION_KEYS, integrationValueValid, isIntegrationPlainKey, type IntegrationKey } from '@ab/shared';

// The one-off import (owner, 2026-10-12): copies the server env's CURRENT integration values into
// the database (plain → integration_config, secret → Vault). Pure here, so it is tested without a
// database; config-import-env.ts wires it to the service-role client.

export interface ImportStore {
  /** Keys that already have a DB value (plain row or Vault secret). */
  existing(): Promise<ReadonlySet<string>>;
  setPlain(key: IntegrationKey, value: string): Promise<void>;
  setSecret(key: IntegrationKey, value: string): Promise<void>;
}

export type ImportOutcome = 'imported' | 'skipped (not set in env)' | 'skipped (already in the database)' | 'skipped (invalid value)';

/** One line per key, KEY NAMES ONLY: nothing returned here ever holds a value. */
export async function importEnv(input: { env: NodeJS.ProcessEnv; store: ImportStore; overwrite: boolean }): Promise<string[]> {
  const { env, store, overwrite } = input;
  const existing = await store.existing();
  const lines: string[] = [];
  for (const { key, secret } of INTEGRATION_KEYS) {
    const value = env[key]?.trim() ?? '';
    let outcome: ImportOutcome;
    if (value === '') outcome = 'skipped (not set in env)';
    else if (existing.has(key) && !overwrite) outcome = 'skipped (already in the database)';
    else if (isIntegrationPlainKey(key) && !integrationValueValid(key, value)) outcome = 'skipped (invalid value)';
    else {
      await (secret ? store.setSecret(key, value) : store.setPlain(key, value));
      outcome = 'imported';
    }
    lines.push(`${key}: ${outcome}`);
  }
  return lines;
}
