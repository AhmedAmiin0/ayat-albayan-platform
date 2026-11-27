import { instant } from '@ab/core';
import { z } from 'zod';
import {
  INTEGRATION_GROUPS,
  INTEGRATION_PLAIN_KEYS,
  INTEGRATION_SECRET_KEYS,
  integrationSourceSchema,
} from './keys/keys';

export const integrationKeySchema = z.enum([...INTEGRATION_PLAIN_KEYS, ...INTEGRATION_SECRET_KEYS]);
export const integrationSecretKeySchema = z.enum(INTEGRATION_SECRET_KEYS);
export const integrationGroupSchema = z.enum(INTEGRATION_GROUPS);

/** One row of GET /settings/integrations. A secret's `value` is always null. */
export const integrationConfigItemSchema = z.object({
  key: integrationKeySchema,
  group: integrationGroupSchema,
  secret: z.boolean(),
  /** The value in use, plain keys only; null for every secret and for an unset key. */
  value: z.string().nullable(),
  set: z.boolean(),
  source: integrationSourceSchema,
  /** When the DB value was last written; null when the value is not from the DB. */
  updated_at: instant.nullable(),
});
export type IntegrationConfigItem = z.infer<typeof integrationConfigItemSchema>;

export const integrationConfigListSchema = z.array(integrationConfigItemSchema);

/** A storage probe that answers at all succeeded; a failure is a refusal (docs/45). */
export const storageProbeResultSchema = z.object({ ok: z.literal(true), ms: z.number() });
export type StorageProbeResult = z.infer<typeof storageProbeResultSchema>;
