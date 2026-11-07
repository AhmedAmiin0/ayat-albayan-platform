// Integration config in the database (owner, 2026-10-12: «make most of the config in the db").
// The keys an admin edits in «التكاملات» (/admin/settings): plain ones live in the
// integration_config table, secret ones in Supabase Vault. A non-empty DB value wins over the
// server env, which stays the fallback. Every other env key (PORT, SUPABASE_*, …) stays in env.

import { GROUP_OF } from './keys.groups.js';
import { STORAGE_DRIVERS, STORAGE_PLAIN_KEYS } from './storage.js';

/** The form's groups, in page order. */
export const INTEGRATION_GROUPS = ['wa_notifications', 'wa_chat', 'kapso', 'wacrm', 'evolution', 'wa_safety', 'calls', 'livekit', 'expo', 'web_push', 'fx', 'google', 'giphy', 'storage', 'stripe'] as const;
export type IntegrationGroup = (typeof INTEGRATION_GROUPS)[number];

export const INTEGRATION_PLAIN_KEYS = [
  'WA_PROVIDER',
  'WA_API_BASE',
  'WA_API_VERSION',
  'WA_PHONE_NUMBER_ID',
  'WA_WABA_ID',
  'WA_APP_ID',
  'WA_CHAT_PHONE_NUMBER_ID',
  'WA_CHAT_WABA_ID',
  'WA_CHAT_APP_ID',
  'WA_CHAT_PROVIDER',
  'KAPSO_API_BASE',
  'KAPSO_API_VERSION',
  'WACRM_API_BASE',
  'EVOLUTION_API_BASE',
  'EVOLUTION_INTERNAL_HOSTS',
  'WA_ALLOWED_RECIPIENTS',
  'WA_TEMPLATE_SYNC',
  'CALLS_STUN_URLS',
  'CALLS_TURN_URLS',
  'LIVEKIT_URL',
  'EXPO_API_BASE',
  'WEB_PUSH_VAPID_PUBLIC_KEY',
  'WEB_PUSH_SUBJECT',
  'FX_API_URL',
  'GOOGLE_CLIENT_ID',
  'STRIPE_ENABLED',
  'STRIPE_MAX_DISCOUNT_PCT',
  ...STORAGE_PLAIN_KEYS,
] as const;

/** Never returned, logged or audited: only their names and whether they are set. */
export const INTEGRATION_SECRET_KEYS = [
  'WA_ACCESS_TOKEN',
  'WA_APP_SECRET',
  'WA_VERIFY_TOKEN',
  'WA_CHAT_ACCESS_TOKEN',
  'WA_CHAT_APP_SECRET',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'EXPO_ACCESS_TOKEN',
  'WEB_PUSH_VAPID_PRIVATE_KEY',
  'KAPSO_API_KEY',
  'KAPSO_WEBHOOK_SECRET',
  'WACRM_API_KEY',
  'WACRM_WEBHOOK_SECRET',
  'EVOLUTION_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'CALLS_TURN_SECRET',
  'GIPHY_API_KEY',
  'STRIPE_API_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MINIO_SECRET_KEY',
] as const;

export type IntegrationPlainKey = (typeof INTEGRATION_PLAIN_KEYS)[number];
export type IntegrationSecretKey = (typeof INTEGRATION_SECRET_KEYS)[number];
export type IntegrationKey = IntegrationPlainKey | IntegrationSecretKey;

export interface IntegrationKeyDef {
  key: IntegrationKey;
  group: IntegrationGroup;
  secret: boolean;
  /** ar.json / en.json: `${i18n}.label` and `${i18n}.hint`. */
  i18n: `integrations.keys.${IntegrationKey}`;
}

const SECRET_SET: ReadonlySet<string> = new Set(INTEGRATION_SECRET_KEYS);
const PLAIN_SET: ReadonlySet<string> = new Set(INTEGRATION_PLAIN_KEYS);

export const isIntegrationSecretKey = (k: string): k is IntegrationSecretKey => SECRET_SET.has(k);
export const isIntegrationPlainKey = (k: string): k is IntegrationPlainKey => PLAIN_SET.has(k);
export const isIntegrationKey = (k: string): k is IntegrationKey => SECRET_SET.has(k) || PLAIN_SET.has(k);

/** Every key in form order: group by group, as GROUP_OF lists them. */
export const INTEGRATION_KEYS: readonly IntegrationKeyDef[] = (Object.keys(GROUP_OF) as IntegrationKey[])
  .map((key) => ({ key, group: GROUP_OF[key], secret: SECRET_SET.has(key), i18n: `integrations.keys.${key}` as const }))
  .sort((a, b) => INTEGRATION_GROUPS.indexOf(a.group) - INTEGRATION_GROUPS.indexOf(b.group));

/**
 * WhatsApp drivers (docs/19): Meta's Cloud API directly, Kapso's Meta proxy, the academy CRM's API,
 * or a self-hosted Evolution API instance (a number's driver only: module mode).
 */
export const WA_PROVIDERS = ['meta', 'kapso', 'crm', 'evolution'] as const;
export type WaProvider = (typeof WA_PROVIDERS)[number];
/** The drivers a legacy line key (WA_PROVIDER / WA_CHAT_PROVIDER) may be switched to by hand. */
export const WA_LINE_PROVIDERS = ['meta', 'kapso', 'crm'] as const;
/** An Evolution instance's engine: Baileys (WhatsApp Web, no 24 h window) or Meta's Cloud API. */
export const EVOLUTION_MODES = ['baileys', 'cloud'] as const;
export type EvolutionMode = (typeof EVOLUTION_MODES)[number];

/** Plain keys with a fixed set of values: the form renders a select, the API refuses anything else. */
export const INTEGRATION_ENUMS: Partial<Record<IntegrationPlainKey, readonly string[]>> = {
  WA_PROVIDER: WA_LINE_PROVIDERS,
  WA_CHAT_PROVIDER: WA_LINE_PROVIDERS,
  // A switch, not a word to type (docs/23a §E H3): the select shows «مفعّلة» / «متوقفة».
  WA_TEMPLATE_SYNC: ['true', 'false'],
  STRIPE_ENABLED: ['false', 'true'], // «الدفع الإلكتروني» (docs/30): off by default.
  STORAGE_DRIVER: STORAGE_DRIVERS, // docs/45: supabase until an admin switches (the cut-over).
  MINIO_RECORDINGS: ['false', 'true'], // docs/45 §1: recordings into MinIO, off by default.
  MINIO_DRIVE_BACKUP: ['false', 'true'], // docs/45 §5: MinIO archives to Google Drive, off.
};

/** The allowed values of an enum key, or null for a free-text key. */
export const integrationEnum = (key: IntegrationKey): readonly string[] | null =>
  (isIntegrationPlainKey(key) ? INTEGRATION_ENUMS[key] : undefined) ?? null;

export function integrationDef(key: IntegrationKey): IntegrationKeyDef {
  const def = INTEGRATION_KEYS.find((d) => d.key === key);
  if (!def) throw new Error(`unknown integration key ${key}`);
  return def;
}
