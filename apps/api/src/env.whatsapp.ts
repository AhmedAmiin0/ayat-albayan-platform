import type { WaLine, WaProvider } from '@ab/shared';
import type { Env } from './env';
import { kapsoLine } from './env.kapso';

// WhatsApp lines (docs/12 §13.1): the notifications line (WA_*) and the optional chat line
// (WA_CHAT_*). Type-only import of Env, so env.ts can re-export this file without a runtime cycle.

export { allowedRecipients, parseAllowedRecipients, recipientAllowed } from './env.recipients';

interface LineConn {
  base: string;
  version: string;
  phoneNumberId: string;
  wabaId: string;
}
/** A line on Meta's Cloud API (provider absent = meta: today's shape, unchanged). */
export interface MetaLineEnv extends LineConn {
  provider?: 'meta';
  accessToken: string;
  /** WA_APP_ID (chat: WA_CHAT_APP_ID); absent = no sample uploads, so a document-header template can't be submitted. */
  appId?: string;
}
/** A line on Kapso's Meta proxy (docs/19): X-API-Key instead of a bearer, never an app id. */
export interface KapsoLineEnv extends LineConn {
  provider: 'kapso';
  apiKey: string;
}
/** What WhatsappClient needs to reach Meta, Kapso (or the stub). */
export type WhatsappEnv = MetaLineEnv | KapsoLineEnv;

/** What each line needs to SEND; null = that line is not configured. */
export type LineEnvs = Record<WaLine, WhatsappEnv | null>;
/** What the webhook needs to RECEIVE: the phone-number id of each line that has one. */
export type LineNumbers = Partial<Record<WaLine, string>>;

const CHAT_KEYS = [
  'WA_CHAT_PHONE_NUMBER_ID',
  'WA_CHAT_WABA_ID',
  'WA_CHAT_ACCESS_TOKEN',
  'WA_CHAT_APP_SECRET',
  'WA_CHAT_APP_ID',
] as const;

function chatEnv(env: Env, base: string | undefined): MetaLineEnv | null {
  const phoneNumberId = env.WA_CHAT_PHONE_NUMBER_ID;
  const wabaId = env.WA_CHAT_WABA_ID;
  const accessToken = env.WA_CHAT_ACCESS_TOKEN ?? env.WA_ACCESS_TOKEN;
  if (!base || !phoneNumberId || !wabaId || !accessToken) return null;
  if (phoneNumberId === env.WA_PHONE_NUMBER_ID) return null;
  const conn = { base, version: env.WA_API_VERSION, phoneNumberId, wabaId, accessToken };
  // Sample uploads belong to the app that owns the chat WABA's token (a document template on chat).
  return env.WA_CHAT_APP_ID ? { ...conn, appId: env.WA_CHAT_APP_ID } : conn;
}

function metaNotifications(env: Env, base: string | undefined): MetaLineEnv | null {
  const { WA_PHONE_NUMBER_ID: phoneNumberId, WA_WABA_ID: wabaId, WA_ACCESS_TOKEN: accessToken } = env;
  if (!base || !phoneNumberId || !wabaId || !accessToken) return null;
  const conn = { base, version: env.WA_API_VERSION, phoneNumberId, wabaId, accessToken };
  return env.WA_APP_ID ? { ...conn, appId: env.WA_APP_ID } : conn;
}

/** Each line's driver (docs/19): WA_PROVIDER / WA_CHAT_PROVIDER, meta unless an admin switched it. */
export function lineProvider(env: Env, line: WaLine): WaProvider {
  return line === 'chat' ? env.WA_CHAT_PROVIDER : env.WA_PROVIDER;
}

/**
 * Each line under its own provider. meta: notifications = today's config (appId = WA_APP_ID); chat =
 * its own ids, token fallback, appId = WA_CHAT_APP_ID (none when unset). kapso: env.kapso.ts kapsoLine (same ids, Kapso base + key).
 */
export function lineEnvs(env: Env): LineEnvs {
  const base = env.WA_API_BASE?.replace(/\/+$/, '');
  const kapso = (line: WaLine) => lineProvider(env, line) === 'kapso';
  return {
    notifications: kapso('notifications') ? kapsoLine(env, 'notifications') : metaNotifications(env, base),
    chat: kapso('chat') ? kapsoLine(env, 'chat') : chatEnv(env, base),
  };
}

/** null = WhatsApp not configured: the client refuses every call and nothing is sent. */
export function whatsappEnv(env: Env): WhatsappEnv | null {
  return lineEnvs(env).notifications;
}

/**
 * The one send gate (docs/12 §3) for the sender, the schedulers and the inbox: env
 * MESSAGING_ENABLED, WhatsApp configured, and the admin's kill switch (settings.messaging_enabled).
 * Any of them off → rows stay queued. The notifications line is mandatory, chat optional.
 */
export function sendingAllowed(env: Env, messagingEnabledSetting: boolean): boolean {
  return env.MESSAGING_ENABLED && whatsappEnv(env) !== null && messagingEnabledSetting;
}

/** POST /webhooks/kapso's HMAC key; never one of the Meta app secrets' routes (docs/19). */
export function kapsoWebhookSecret(env: Env): string | undefined {
  return env.KAPSO_WEBHOOK_SECRET;
}

/** Webhook secrets of the Meta route: distinct, non-blank [WA_APP_SECRET, WA_CHAT_APP_SECRET]. */
export function appSecrets(env: Env): string[] {
  const all = [env.WA_APP_SECRET, env.WA_CHAT_APP_SECRET];
  return [...new Set(all.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
}

/**
 * The webhook filter. chat = WA_CHAT_PHONE_NUMBER_ID ALONE (no token / WABA / base needed): a
 * half-configured chat line must still receive, since Meta never retries a 200.
 */
export function lineNumbers(env: Env): LineNumbers {
  const { WA_PHONE_NUMBER_ID: notifications, WA_CHAT_PHONE_NUMBER_ID: chat } = env;
  return {
    ...(notifications ? { notifications } : {}),
    ...(chat && chat !== notifications ? { chat } : {}),
  };
}

/** Any WA_CHAT_* key set: the admin means to have a chat line. */
export const hasChatKeys = (env: Env): boolean => CHAT_KEYS.some((k) => env[k] !== undefined);

/** Key NAMES (never values) of the chat pieces SENDING still lacks, once any WA_CHAT_* key is set. */
export function chatKeyGaps(env: Env): string[] {
  if (!hasChatKeys(env)) return [];
  const present = {
    WA_CHAT_PHONE_NUMBER_ID: env.WA_CHAT_PHONE_NUMBER_ID,
    WA_CHAT_WABA_ID: env.WA_CHAT_WABA_ID,
    WA_CHAT_ACCESS_TOKEN: env.WA_CHAT_ACCESS_TOKEN ?? env.WA_ACCESS_TOKEN,
  };
  return Object.entries(present)
    .filter(([, v]) => v === undefined)
    .map(([k]) => k);
}
