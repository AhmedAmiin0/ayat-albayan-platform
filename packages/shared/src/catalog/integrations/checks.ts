import { z } from 'zod';
import {
  isIntegrationPlainKey,
  WA_PROVIDERS,
  type IntegrationPlainKey,
  type IntegrationSecretKey,
} from './keys.js';
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

/**
 * Stripe (docs/30, TEST BUILD ONLY): a sandbox restricted or secret key. Anything else, a live key
 * (rk_live_ / sk_live_) above all, is refused: this build never takes real money.
 */
export const stripeApiKey = z.string().regex(/^(rk|sk)_test_[A-Za-z0-9]+$/, 'stripe_live_key_refused');
/** The signing secret of the Stripe webhook endpoint (/webhooks/stripe on the API host). */
export const stripeWebhookSecret = z.string().regex(/^whsec_[A-Za-z0-9+/=]+$/, 'invalid_value');
/** The admin's cap on a payment link's discount below the calculator price, in %. */
export const stripeMaxDiscountPct = z.coerce.number().min(0).max(100);

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
  STRIPE_ENABLED: z.stringbool(),
  STRIPE_MAX_DISCOUNT_PCT: stripeMaxDiscountPct,
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

/** Secrets with a format of their own; any other secret is free text. */
const SECRET_CHECKS: Partial<Record<IntegrationSecretKey, z.ZodType<string>>> = {
  STRIPE_API_KEY: stripeApiKey,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
};

/** The check of a secret's value (already trimmed by integrationSecretSchema). */
export const integrationSecretCheck = (key: IntegrationSecretKey): z.ZodType<string> =>
  SECRET_CHECKS[key] ?? z.string();
