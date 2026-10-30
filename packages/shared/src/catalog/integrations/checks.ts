import { z } from 'zod';
import { isIntegrationPlainKey, WA_PROVIDERS, type IntegrationPlainKey } from './keys.js';
import { parseAllowedRecipients } from './recipients.js';

// The value checks of the plain keys, consistent with apps/api/src/config/env/env.ts (the API also re-checks
// every DB value with its own env schema before using it).

/** integration_config.value: octet_length(value) <= 4096 (ASCII keys and values in practice). */
export const INTEGRATION_VALUE_MAX = 4096;

const id = z.string().min(1).max(200);
const url = z.url().max(INTEGRATION_VALUE_MAX);
const recipients = z
  .string()
  .max(INTEGRATION_VALUE_MAX)
  .refine((raw) => parseAllowedRecipients(raw).bad === null, 'not_e164');
/** RFC 8292: the application server's P-256 public key, uncompressed (65 bytes), base64url. */
export const vapidPublicKey = z.string().regex(/^[A-Za-z0-9_-]{87}$/);
/** RFC 8292 `sub`: a mailto: address or an https: URL the push service may contact. */
export const vapidSubject = z.string().max(200).regex(/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/);

/** A Google Cloud OAuth client id: «<digits>-<id>.apps.googleusercontent.com». */
export const googleClientId = z.string().max(200).regex(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/);

/** Comma-separated ICE server URLs (RFC 7064 / 7065): stun:, turn: or turns: with a host. */
export const iceUrls = z
  .string()
  .max(1000)
  .refine((raw) => raw.split(',').every((u) => /^(stun|turns?):[A-Za-z0-9.-]+(:\d{1,5})?(\?transport=(udp|tcp))?$/.test(u.trim())), 'ice_url');

const version = z.string().regex(/^v\d+\.\d+$/);
const provider = z.enum(WA_PROVIDERS);

export const INTEGRATION_VALUE_CHECKS: Record<IntegrationPlainKey, z.ZodType> = {
  WA_PROVIDER: provider,
  WA_API_BASE: url,
  WA_API_VERSION: version,
  WA_PHONE_NUMBER_ID: id,
  WA_WABA_ID: id,
  WA_APP_ID: id,
  WA_CHAT_PHONE_NUMBER_ID: id,
  WA_CHAT_WABA_ID: id,
  WA_CHAT_APP_ID: id,
  WA_CHAT_PROVIDER: provider,
  KAPSO_API_BASE: url,
  KAPSO_API_VERSION: version,
  WACRM_API_BASE: url,
  WA_ALLOWED_RECIPIENTS: recipients,
  WA_TEMPLATE_SYNC: z.stringbool(),
  CALLS_STUN_URLS: iceUrls,
  CALLS_TURN_URLS: iceUrls,
  LIVEKIT_URL: url,
  EXPO_API_BASE: url,
  WEB_PUSH_VAPID_PUBLIC_KEY: vapidPublicKey,
  WEB_PUSH_SUBJECT: vapidSubject,
  FX_API_URL: url,
  GOOGLE_CLIENT_ID: googleClientId,
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
