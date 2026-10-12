// Integration config in the database (owner, 2026-10-12: «make most of the config in the db").
// The keys an admin edits in «التكاملات» (/admin/settings): plain ones live in the
// integration_config table, secret ones in Supabase Vault. A non-empty DB value wins over the
// server env, which stays the fallback. Every other env key (PORT, SUPABASE_*, …) stays in env.

/** The form's groups, in page order. */
export const INTEGRATION_GROUPS = ['wa_notifications', 'wa_chat', 'wa_safety', 'livekit', 'expo', 'fx'] as const;
export type IntegrationGroup = (typeof INTEGRATION_GROUPS)[number];

export const INTEGRATION_PLAIN_KEYS = [
  'WA_API_BASE',
  'WA_API_VERSION',
  'WA_PHONE_NUMBER_ID',
  'WA_WABA_ID',
  'WA_APP_ID',
  'WA_CHAT_PHONE_NUMBER_ID',
  'WA_CHAT_WABA_ID',
  'WA_CHAT_APP_ID',
  'WA_ALLOWED_RECIPIENTS',
  'WA_TEMPLATE_SYNC',
  'LIVEKIT_URL',
  'EXPO_API_BASE',
  'FX_API_URL',
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

/** Each key's group, in the form's order inside the group. */
const GROUP_OF: Record<IntegrationKey, IntegrationGroup> = {
  WA_API_BASE: 'wa_notifications',
  WA_API_VERSION: 'wa_notifications',
  WA_PHONE_NUMBER_ID: 'wa_notifications',
  WA_WABA_ID: 'wa_notifications',
  WA_APP_ID: 'wa_notifications',
  WA_ACCESS_TOKEN: 'wa_notifications',
  WA_APP_SECRET: 'wa_notifications',
  WA_VERIFY_TOKEN: 'wa_notifications',
  WA_CHAT_PHONE_NUMBER_ID: 'wa_chat',
  WA_CHAT_WABA_ID: 'wa_chat',
  WA_CHAT_APP_ID: 'wa_chat',
  WA_CHAT_ACCESS_TOKEN: 'wa_chat',
  WA_CHAT_APP_SECRET: 'wa_chat',
  WA_ALLOWED_RECIPIENTS: 'wa_safety',
  WA_TEMPLATE_SYNC: 'wa_safety',
  LIVEKIT_URL: 'livekit',
  LIVEKIT_API_KEY: 'livekit',
  LIVEKIT_API_SECRET: 'livekit',
  EXPO_API_BASE: 'expo',
  EXPO_ACCESS_TOKEN: 'expo',
  FX_API_URL: 'fx',
};

const SECRET_SET: ReadonlySet<string> = new Set(INTEGRATION_SECRET_KEYS);
const PLAIN_SET: ReadonlySet<string> = new Set(INTEGRATION_PLAIN_KEYS);

export const isIntegrationSecretKey = (k: string): k is IntegrationSecretKey => SECRET_SET.has(k);
export const isIntegrationPlainKey = (k: string): k is IntegrationPlainKey => PLAIN_SET.has(k);
export const isIntegrationKey = (k: string): k is IntegrationKey => SECRET_SET.has(k) || PLAIN_SET.has(k);

/** Every key in form order: group by group, as GROUP_OF lists them. */
export const INTEGRATION_KEYS: readonly IntegrationKeyDef[] = (Object.keys(GROUP_OF) as IntegrationKey[])
  .map((key) => ({ key, group: GROUP_OF[key], secret: SECRET_SET.has(key), i18n: `integrations.keys.${key}` as const }))
  .sort((a, b) => INTEGRATION_GROUPS.indexOf(a.group) - INTEGRATION_GROUPS.indexOf(b.group));

export function integrationDef(key: IntegrationKey): IntegrationKeyDef {
  const def = INTEGRATION_KEYS.find((d) => d.key === key);
  if (!def) throw new Error(`unknown integration key ${key}`);
  return def;
}
