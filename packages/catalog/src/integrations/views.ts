import type { IntegrationGroup, IntegrationKey } from './keys.js';

/** Where the value in use comes from: the database, the server env, or nowhere. */
export type IntegrationSource = 'db' | 'env' | 'unset';

/** One row of GET /settings/integrations. A secret's `value` is ALWAYS null. */
export interface IntegrationConfigItem {
  key: IntegrationKey;
  group: IntegrationGroup;
  secret: boolean;
  /** The value in use, plain keys only; null for every secret and for an unset key. */
  value: string | null;
  set: boolean;
  source: IntegrationSource;
  /** When the DB value was last written; null when the value is not from the DB. */
  updated_at: string | null;
}
