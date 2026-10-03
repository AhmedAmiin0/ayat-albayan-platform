import { z } from 'zod';

/** `KEY=` (empty, as in .env.example) means unset, never a boot failure. */
const blankIsUnset = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalSecret = z.preprocess(blankIsUnset, z.string().trim().min(1).optional());

// Secrets only via env (rule 9). Fails fast at boot when something required is missing.
// WhatsApp and Expo values are all optional: without them messaging stays off (docs/12 §3).
const schema = z.object({
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.url(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  /** Server-only key for the DbModule client (bypasses RLS; Nest guards enforce access). */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** SAR-based latest-rates endpoint (docs/08 §4); a keyed ExchangeRate-API URL also works. */
  FX_API_URL: z.url().default('https://open.er-api.com/v6/latest/SAR'),
  /**
   * Graph API base. No default on purpose: local and e2e point it at tools/wa-stub, and only a
   * deliberate production setting ever names graph.facebook.com.
   */
  WA_API_BASE: z.preprocess(blankIsUnset, z.url().optional()),
  WA_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v21.0'),
  WA_PHONE_NUMBER_ID: optionalSecret,
  WA_WABA_ID: optionalSecret,
  WA_ACCESS_TOKEN: optionalSecret,
  /**
   * The Meta app that issued WA_ACCESS_TOKEN. Only the Resumable Upload API needs it (the sample
   * PDF of a document-header template, report_ready); without it that submit is 409 needs_app_id.
   */
  WA_APP_ID: optionalSecret,
  /** Meta app secret: X-Hub-Signature-256 of every webhook POST. */
  WA_APP_SECRET: optionalSecret,
  /** hub.verify_token answered by GET /webhooks/whatsapp. */
  WA_VERIFY_TOKEN: optionalSecret,
  /** Expo push access token (only when the Expo project enforces push security). */
  EXPO_ACCESS_TOKEN: optionalSecret,
  /**
   * Expo push API base («https://exp.host» in production). No default on purpose: unset = admin
   * pushes are recorded but never leave the server (local, e2e), like WA_API_BASE.
   */
  EXPO_API_BASE: z.preprocess(blankIsUnset, z.url().optional()),
  /**
   * HMAC key of the «رأيك يهمّنا» links (>= 32 chars, via Vault). Unset = feedback requests are 503
   * not_configured and every public link is refused; nothing else depends on it.
   */
  FEEDBACK_TOKEN_SECRET: z.preprocess(blankIsUnset, z.string().min(32).optional()),
  /** Deployment-level send gate; the admin's settings.messaging_enabled must also be true. */
  MESSAGING_ENABLED: z.preprocess(blankIsUnset, z.stringbool().default(false)),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return schema.parse(source);
}

/** What WhatsappClient needs to reach Meta (or the stub). */
export interface WhatsappEnv {
  base: string;
  version: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  /** WA_APP_ID; absent = no sample uploads, so a document-header template can't be submitted. */
  appId?: string;
}

/** null = WhatsApp not configured: the client refuses every call and nothing is sent. */
export function whatsappEnv(env: Env): WhatsappEnv | null {
  const { WA_API_BASE: base, WA_PHONE_NUMBER_ID: phoneNumberId, WA_WABA_ID: wabaId, WA_ACCESS_TOKEN: accessToken } = env;
  if (!base || !phoneNumberId || !wabaId || !accessToken) return null;
  const conn = { base: base.replace(/\/+$/, ''), version: env.WA_API_VERSION, phoneNumberId, wabaId, accessToken };
  return env.WA_APP_ID ? { ...conn, appId: env.WA_APP_ID } : conn;
}

/**
 * The one send gate (docs/12 §3) for the sender, the schedulers and the inbox: env
 * MESSAGING_ENABLED, WhatsApp configured, and the admin's kill switch (settings.messaging_enabled).
 * Any of them off → rows stay queued.
 */
export function sendingAllowed(env: Env, messagingEnabledSetting: boolean): boolean {
  return env.MESSAGING_ENABLED && whatsappEnv(env) !== null && messagingEnabledSetting;
}
