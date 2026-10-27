import type { WaLine } from '@ab/shared';
import type { Env } from './env';
import { bothOnCrm, crmGaps } from './whatsapp/env.crm';
import { duplicateChatPhone, kapsoGaps } from './whatsapp/env.kapso';
import { chatKeyGaps, hasChatKeys, lineProvider } from './whatsapp/env.whatsapp';

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
 * NAMES (never values) of what a line still lacks to send under its provider: crm → crmGaps; kapso → kapsoGaps;
 * meta chat → metaChatGaps; meta notifications → whichever of its four required keys is unset.
 */
export function lineGaps(env: Env, line: WaLine): string[] {
  const provider = lineProvider(env, line);
  if (provider === 'crm') return crmGaps(env);
  if (provider === 'kapso') return kapsoGaps(env, line);
  if (line === 'chat') return metaChatGaps(env);
  return META_NOTIFICATION_KEYS.filter((k) => env[k] === undefined);
}

/**
 * The chat line is the notifications line's number: its phone id is the notifications one (a meta / kapso
 * chat line), or both lines are on crm (one CRM account = one number, docs/19). That line stays off. A crm
 * chat line has no phone id of ours, so a leftover WA_CHAT_PHONE_NUMBER_ID never flags it (crmLine sends).
 */
export function duplicatePhone(env: Env, line: WaLine): boolean {
  if (line !== 'chat') return false;
  return bothOnCrm(env) || (lineProvider(env, 'chat') !== 'crm' && duplicateChatPhone(env));
}

/** The boot log's words for a duplicate chat phone id («افحص الخطوط» shows duplicate_chat_phone instead). */
export const DUPLICATE_CHAT_PHONE = 'WA_CHAT_PHONE_NUMBER_ID (same as WA_PHONE_NUMBER_ID)';
/** The boot log's words when both lines are on crm. */
const BOTH_ON_CRM = 'WA_CHAT_PROVIDER (crm, same as WA_PROVIDER)';

/**
 * What the boot log names for a line: lineGaps plus the duplicate-id sentence. An unset meta
 * notifications line just means messaging is off (local dev): nothing to name, as before.
 */
export function bootGaps(env: Env, line: WaLine): string[] {
  const names = line === 'notifications' && lineProvider(env, line) === 'meta' ? [] : lineGaps(env, line);
  if (!duplicatePhone(env, line)) return names;
  return [...names, bothOnCrm(env) ? BOTH_ON_CRM : DUPLICATE_CHAT_PHONE];
}
