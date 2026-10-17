import type { WaLine } from '@ab/shared';
import type { Env } from './env';
import { duplicateChatPhone, kapsoGaps } from './env.kapso';
import { chatKeyGaps, hasChatKeys, lineProvider } from './env.whatsapp';

// What each line still lacks to send, for «افحص الخطوط» and the boot log (docs/19): key NAMES only.

const META_NOTIFICATION_KEYS = ['WA_API_BASE', 'WA_PHONE_NUMBER_ID', 'WA_WABA_ID', 'WA_ACCESS_TOKEN'] as const;

/**
 * A meta chat line, once any WA_CHAT_* key is set: chatKeyGaps, plus WA_API_BASE when it is unset
 * (it may be, with the notifications line on kapso). The duplicate id is a flag, not a name.
 */
function metaChatGaps(env: Env): string[] {
  if (!hasChatKeys(env)) return [];
  const keys = chatKeyGaps(env);
  return env.WA_API_BASE === undefined ? ['WA_API_BASE', ...keys] : keys;
}

/**
 * NAMES (never values) of what a line still lacks to send under its provider: kapso → kapsoGaps;
 * meta chat → metaChatGaps; meta notifications → whichever of its four required keys is unset.
 */
export function lineGaps(env: Env, line: WaLine): string[] {
  if (lineProvider(env, line) === 'kapso') return kapsoGaps(env, line);
  if (line === 'chat') return metaChatGaps(env);
  return META_NOTIFICATION_KEYS.filter((k) => env[k] === undefined);
}

/** The chat line's phone id is the notifications one: that line stays off (either driver). */
export function duplicatePhone(env: Env, line: WaLine): boolean {
  return line === 'chat' && duplicateChatPhone(env);
}

/** The boot log's words for a duplicate chat phone id («افحص الخطوط» shows duplicate_chat_phone instead). */
export const DUPLICATE_CHAT_PHONE = 'WA_CHAT_PHONE_NUMBER_ID (same as WA_PHONE_NUMBER_ID)';

/**
 * What the boot log names for a line: lineGaps plus the duplicate-id sentence. An unset meta
 * notifications line just means messaging is off (local dev): nothing to name, as before.
 */
export function bootGaps(env: Env, line: WaLine): string[] {
  const names = line === 'notifications' && lineProvider(env, line) === 'meta' ? [] : lineGaps(env, line);
  return duplicatePhone(env, line) ? [...names, DUPLICATE_CHAT_PHONE] : names;
}
