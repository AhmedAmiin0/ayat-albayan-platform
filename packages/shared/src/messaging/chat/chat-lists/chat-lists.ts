import { E164_RE, normalizeArabic, normalizePhone } from '@ab/core';

// Chat lists (docs/22) only organise chats; nothing is ever sent because of a list.

/** A name has 1–30 characters after trimming, not only tashkeel or tatweel (never an empty key). */
export const CHAT_LIST_NAME_MAX = 30;
/** At most 30 lists for the whole academy (POST answers 409 list_limit). */
export const CHAT_LIST_LIMIT = 30;

/** The 409 codes of the lists endpoints, shown inline by the dialogs. */
export const CHAT_LIST_ERRORS = ['list_name_taken', 'list_limit'] as const;

/** Automatic lists (migration 20261025000710, docs/22) only add members, never remove them. */
export const CHAT_LIST_AUTO_RULES = ['subscribed', 'teachers'] as const;

/** Same list when keys match: case, spaces, tashkeel and Arabic letter variants are ignored. */
export function chatListNameKey(name: string): string {
  return normalizeArabic(name);
}

/**
 * A list member is a chat's E.164 number (a new-chat number with no message yet counts). Any
 * E.164 thread key is kept as is (a landline WhatsApp Business number too); other spellings are
 * normalised.
 */
export function chatListPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (E164_RE.test(trimmed)) return trimmed;
  const phone = normalizePhone(raw);
  return phone.ok ? phone.e164 : null;
}
