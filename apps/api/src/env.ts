import { isIntegrationKey, parseAllowedRecipients } from '@ab/shared';
import { z } from 'zod';
import { integrationOverlay } from './config/integration-overlay';
import { GOOGLE_SHAPE } from './env.google';
import { KAPSO_SHAPE } from './env.kapso';
import { WEB_PUSH_SHAPE } from './env.web-push';

export { whatsappEnv, sendingAllowed, lineEnvs, appSecrets, lineNumbers, lineProvider } from './env.whatsapp';
export { lineGaps, duplicatePhone, bootGaps, DUPLICATE_CHAT_PHONE } from './env.gaps';
export { allowedRecipients, recipientAllowed, parseAllowedRecipients, kapsoWebhookSecret } from './env.whatsapp';
export type { WhatsappEnv, MetaLineEnv, KapsoLineEnv, LineEnvs, LineNumbers } from './env.whatsapp';
export { livekitEnv, type LivekitEnv } from './env.livekit';
export { webPushEnv } from './env.web-push';
export { googleEnv, googleRedirectUri, type GoogleEnv, type GoogleEndpoints } from './env.google';

/** `KEY=` (empty, as in .env.example) means unset, never a boot failure. */
const blankIsUnset = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalSecret = z.preprocess(blankIsUnset, z.string().trim().min(1).optional());
/** Comma list → normalised E.164 list; any bad item fails the boot, naming it (fail closed). */
const recipientList = z.string().transform((raw, ctx) => {
  const { items, bad } = parseAllowedRecipients(raw);
  if (bad === null) return items;
  ctx.addIssue({ code: 'custom', message: `WA_ALLOWED_RECIPIENTS: not an E.164 number: ${bad}` });
  return z.NEVER;
});

// Secrets via env or Vault (rule 9). Fails fast at boot when something required is missing.
// WhatsApp and Expo values are all optional: without them messaging stays off (docs/12 §3).
// The integration keys (@ab/shared INTEGRATION_KEYS) may also come from the database (loadEnv).
const schema = z.object({
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.url(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  /** Server-only key for the DbModule client (bypasses RLS; Nest guards enforce access). */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Anon key: re-checks a current password on an isolated client (R-ACC-02..04); unset = service key. */
  SUPABASE_ANON_KEY: optionalSecret,
  /** SAR-based latest-rates endpoint (docs/08 §4); a keyed ExchangeRate-API URL also works. */
  FX_API_URL: z.url().default('https://open.er-api.com/v6/latest/SAR'),
  /** Graph API base. No default: local/e2e = tools/wa-stub; only production names graph.facebook.com. */
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
  /** Chat line (docs/12 §13.1): its phone-number id ALONE makes the webhook accept that line. */
  WA_CHAT_PHONE_NUMBER_ID: optionalSecret,
  /** Chat line's WABA: needed to SEND from it. */
  WA_CHAT_WABA_ID: optionalSecret,
  /** Chat line's token; falls back to WA_ACCESS_TOKEN. */
  WA_CHAT_ACCESS_TOKEN: optionalSecret,
  /** Webhook secret of the chat line's Meta app; signatures may match either secret. */
  WA_CHAT_APP_SECRET: optionalSecret,
  /** Chat line's Meta app id: its PDF-header sample uploads (chatEnv) and the line check; no fallback to WA_APP_ID. */
  WA_CHAT_APP_ID: optionalSecret,
  /** Staging guard: only these E.164 numbers may receive anything; unset/blank = no restriction. */
  WA_ALLOWED_RECIPIENTS: z.preprocess(blankIsUnset, recipientList.optional()),
  /** false = the template sync and submit stop (Meta test credentials must not rewrite the registry). */
  WA_TEMPLATE_SYNC: z.preprocess(blankIsUnset, z.stringbool().default(true)),
  ...KAPSO_SHAPE,
  /** Expo push access token (only when the Expo project enforces push security). */
  EXPO_ACCESS_TOKEN: optionalSecret,
  /**
   * Expo push API base («https://exp.host» in production). No default on purpose: unset = admin
   * pushes are recorded but never leave the server (local, e2e), like WA_API_BASE.
   */
  EXPO_API_BASE: z.preprocess(blankIsUnset, z.url().optional()),
  ...WEB_PUSH_SHAPE,
  ...GOOGLE_SHAPE,
  /**
   * HMAC key of the «رأيك يهمّنا» links (>= 32 chars, via Vault). Unset = feedback requests are 503
   * not_configured and every public link is refused; nothing else depends on it.
   */
  FEEDBACK_TOKEN_SECRET: z.preprocess(blankIsUnset, z.string().min(32).optional()),
  /**
   * Self-hosted LiveKit (online classrooms, tools/livekit/README.md). All three or none: unset =
   * the join routes answer 503 classroom_not_configured and nothing else depends on them. The API
   * mints plain HS256 join tokens with them (no SDK); the values are never committed.
   */
  LIVEKIT_URL: z.preprocess(blankIsUnset, z.url().optional()),
  LIVEKIT_API_KEY: optionalSecret,
  LIVEKIT_API_SECRET: optionalSecret,
  /** The outbound sender's tick in ms (default 30 s); e2e sets ~1 s, production leaves it unset. */
  MESSAGE_SENDER_POLL_MS: z.preprocess(blankIsUnset, z.coerce.number().int().min(200).optional()),
  /**
   * Lesson recordings (env.recording.ts): the Supabase Storage S3 endpoint the LiveKit egress
   * uploads the MP4s to. All five or none: unset = lessons are not recorded, nothing else changes.
   */
  RECORDING_S3_ENDPOINT: z.preprocess(blankIsUnset, z.url().optional()),
  RECORDING_S3_REGION: optionalSecret,
  RECORDING_S3_BUCKET: optionalSecret,
  RECORDING_S3_ACCESS_KEY: optionalSecret,
  RECORDING_S3_SECRET: optionalSecret,
  /**
   * How long the academy settings stay cached in memory (ms, default 30 s). A PATCH /settings on
   * this instance clears the cache at once; the TTL covers other instances and direct SQL writes.
   * e2e sets 0 (its specs write settings rows with SQL).
   */
  SETTINGS_CACHE_MS: z.preprocess(blankIsUnset, z.coerce.number().int().min(0).default(30_000)),
  /** false = ignore the database's integration config (env only); vitest sets it so no boot reads it. */
  INTEGRATION_CONFIG_FROM_DB: z.preprocess(blankIsUnset, z.stringbool().default(true)),
  /** Deployment-level send gate; the admin's settings.messaging_enabled must also be true. */
  MESSAGING_ENABLED: z.preprocess(blankIsUnset, z.stringbool().default(false)),
  /**
   * Shortest password an admin may type for a login (POST /users, reset-password); generated ones
   * are at least as long. Keep it >= the project's Auth setting (supabase config minimum_password_length).
   */
  AUTH_PASSWORD_MIN_LENGTH: z.preprocess(blankIsUnset, z.coerce.number().int().min(6).max(72).default(8)),
});

export type Env = z.infer<typeof schema>;

/**
 * The API's config. Called with no argument (every reader in app code): process.env with the
 * database's integration values on top (config/integration-overlay, a non-empty DB value wins).
 * Called with an explicit source (tests, the import command): that source alone, nothing added.
 * The overlay is pre-checked key by key, and should the merge still fail, env alone is used: a DB
 * value never makes this throw.
 */
export function loadEnv(source?: NodeJS.ProcessEnv): Env {
  if (source !== undefined) return schema.parse(source);
  const overlay = integrationOverlay();
  if (Object.keys(overlay).length === 0) return schema.parse(process.env);
  const merged = schema.safeParse({ ...process.env, ...overlay });
  return merged.success ? merged.data : schema.parse(process.env);
}

/**
 * The DB values that may go into the overlay: registry keys only, non-blank, each valid for its
 * own key in this schema. A bad one is dropped and `onBad` gets its KEY (never the value).
 */
export function validOverlay(raw: Readonly<Record<string, string>>, onBad: (key: string) => void): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isIntegrationKey(key) || value.trim() === '') continue;
    if (schema.shape[key].safeParse(value).success) out[key] = value;
    else onBad(key);
  }
  return out;
}
