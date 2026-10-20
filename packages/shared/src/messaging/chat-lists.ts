import { z } from 'zod';
import { normalizeArabic } from '../arabic.js';
import { normalizePhone } from '../phone.js';

// Chat lists «القوائم» (owner 2026-10-20, docs/22): academy-wide names that only ORGANISE chats, like
// WhatsApp Business lists. Nothing is ever sent because of a list.

/** A list's name: 1–30 characters after trimming (docs/22 §1). */
export const CHAT_LIST_NAME_MAX = 30;
/** At most 30 lists for the whole academy (POST answers 409 list_limit). */
export const CHAT_LIST_LIMIT = 30;

export const chatListNameSchema = z.string().trim().min(1).max(CHAT_LIST_NAME_MAX);

/** POST /chat-lists and PATCH /chat-lists/:id. */
export const chatListBodySchema = z.object({ name: chatListNameSchema });
export type ChatListBody = z.infer<typeof chatListBodySchema>;

/** The 409 codes of the lists endpoints, shown inline by the dialogs. */
export const CHAT_LIST_ERRORS = ['list_name_taken', 'list_limit'] as const;
export type ChatListError = (typeof CHAT_LIST_ERRORS)[number];

export const isChatListError = (code: unknown): code is ChatListError =>
  CHAT_LIST_ERRORS.some((c) => c === code);

/**
 * Two names are the same list when their keys match: case, spaces, tashkeel and the Arabic letter
 * variants (أ/إ/آ → ا, ة → ه, ى → ي) are ignored (chat_lists.name_key is unique).
 */
export function chatListNameKey(name: string): string {
  return normalizeArabic(name);
}

/** A list member is a chat's E.164 number (a new-chat number with no message yet counts). */
export function chatListPhone(raw: string): string | null {
  const phone = normalizePhone(raw);
  return phone.ok ? phone.e164 : null;
}

/** GET /chat-lists: oldest first; `count` = the chats in it. */
export interface ChatList {
  id: string;
  name: string;
  count: number;
}

/** A list a chat is in (GET /threads/:phone → `lists`). */
export interface ChatListRef {
  id: string;
  name: string;
}
