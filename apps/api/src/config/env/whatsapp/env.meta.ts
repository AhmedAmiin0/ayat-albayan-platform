import type { Env } from '../env';
import type { MetaLineEnv } from './env.whatsapp';

// The meta driver's two lines (docs/12 §13.1), out of env.whatsapp.ts (150-line cap). Type-only imports.

const CHAT_KEYS = [
  'WA_CHAT_PHONE_NUMBER_ID',
  'WA_CHAT_WABA_ID',
  'WA_CHAT_ACCESS_TOKEN',
  'WA_CHAT_APP_SECRET',
  'WA_CHAT_APP_ID',
] as const;

/** The chat token: its own; under legacy only, WA_ACCESS_TOKEN when unset (the PR #142 item 15 rule). */
const chatToken = (env: Env): string | undefined =>
  env.linesFromNumbers === true ? env.WA_CHAT_ACCESS_TOKEN : (env.WA_CHAT_ACCESS_TOKEN ?? env.WA_ACCESS_TOKEN);

export function chatEnv(env: Env, base: string | undefined): MetaLineEnv | null {
  const phoneNumberId = env.WA_CHAT_PHONE_NUMBER_ID;
  const wabaId = env.WA_CHAT_WABA_ID;
  const accessToken = chatToken(env);
  if (!base || !phoneNumberId || !wabaId || !accessToken) return null;
  if (phoneNumberId === env.WA_PHONE_NUMBER_ID) return null;
  const conn = { base, version: env.WA_API_VERSION, phoneNumberId, wabaId, accessToken };
  // Sample uploads belong to the app that owns the chat WABA's token (a document template on chat).
  return env.WA_CHAT_APP_ID ? { ...conn, appId: env.WA_CHAT_APP_ID } : conn;
}

export function metaNotifications(env: Env, base: string | undefined): MetaLineEnv | null {
  const { WA_PHONE_NUMBER_ID: phoneNumberId, WA_WABA_ID: wabaId, WA_ACCESS_TOKEN: accessToken } = env;
  if (!base || !phoneNumberId || !wabaId || !accessToken) return null;
  const conn = { base, version: env.WA_API_VERSION, phoneNumberId, wabaId, accessToken };
  return env.WA_APP_ID ? { ...conn, appId: env.WA_APP_ID } : conn;
}

/** Any WA_CHAT_* key set: the admin means to have a chat line. */
export const hasChatKeys = (env: Env): boolean => CHAT_KEYS.some((k) => env[k] !== undefined);

/** Key NAMES (never values) of the chat pieces SENDING still lacks, once any WA_CHAT_* key is set. */
export function chatKeyGaps(env: Env): string[] {
  if (!hasChatKeys(env)) return [];
  const present = {
    WA_CHAT_PHONE_NUMBER_ID: env.WA_CHAT_PHONE_NUMBER_ID,
    WA_CHAT_WABA_ID: env.WA_CHAT_WABA_ID,
    WA_CHAT_ACCESS_TOKEN: chatToken(env),
  };
  return Object.entries(present)
    .filter(([, v]) => v === undefined)
    .map(([k]) => k);
}
