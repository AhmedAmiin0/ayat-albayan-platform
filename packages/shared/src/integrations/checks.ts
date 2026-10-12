import { z } from 'zod';
import { isIntegrationPlainKey, type IntegrationPlainKey } from './keys.js';
import { parseAllowedRecipients } from './recipients.js';

// The value checks of the plain keys, consistent with apps/api/src/env.ts (the API also re-checks
// every DB value with its own env schema before using it).

/** integration_config.value: octet_length(value) <= 4096 (ASCII keys and values in practice). */
export const INTEGRATION_VALUE_MAX = 4096;

const id = z.string().min(1).max(200);
const url = z.url().max(INTEGRATION_VALUE_MAX);
const recipients = z
  .string()
  .max(INTEGRATION_VALUE_MAX)
  .refine((raw) => parseAllowedRecipients(raw).bad === null, 'not_e164');

export const INTEGRATION_VALUE_CHECKS: Record<IntegrationPlainKey, z.ZodType> = {
  WA_API_BASE: url,
  WA_API_VERSION: z.string().regex(/^v\d+\.\d+$/),
  WA_PHONE_NUMBER_ID: id,
  WA_WABA_ID: id,
  WA_APP_ID: id,
  WA_CHAT_PHONE_NUMBER_ID: id,
  WA_CHAT_WABA_ID: id,
  WA_CHAT_APP_ID: id,
  WA_ALLOWED_RECIPIENTS: recipients,
  WA_TEMPLATE_SYNC: z.stringbool(),
  LIVEKIT_URL: url,
  EXPO_API_BASE: url,
  FX_API_URL: url,
};

/** Is `value` (trimmed) acceptable for this plain key? */
export function integrationValueValid(key: IntegrationPlainKey, value: string): boolean {
  return INTEGRATION_VALUE_CHECKS[key].safeParse(value.trim()).success;
}

/**
 * PUT /settings/integrations: plain keys only; a value is trimmed, and null or blank clears the
 * key (the env value applies again). An issue's path names the key, never echoing a secret.
 */
export const integrationValuesSchema = z.object({
  values: z
    .record(z.string(), z.string().nullable())
    .transform((raw, ctx) => {
      const out: Partial<Record<IntegrationPlainKey, string | null>> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (!isIntegrationPlainKey(key)) {
          ctx.addIssue({ code: 'custom', path: [key], message: 'unknown_key' });
          continue;
        }
        const v = value === null || value.trim() === '' ? null : value.trim();
        if (v !== null && !integrationValueValid(key, v)) ctx.addIssue({ code: 'custom', path: [key], message: 'invalid_value' });
        out[key] = v;
      }
      return out;
    }),
});
export type IntegrationValuesInput = z.input<typeof integrationValuesSchema>;

/** PUT /settings/integrations/secrets/:key. */
export const integrationSecretSchema = z.object({ value: z.string().trim().min(1).max(INTEGRATION_VALUE_MAX) });
export type IntegrationSecretInput = z.infer<typeof integrationSecretSchema>;
