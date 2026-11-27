import { normalizeArabic } from '@ab/core';
import { z } from 'zod';
import {
  CHAT_LIST_AUTO_RULES,
  CHAT_LIST_ERRORS,
  CHAT_LIST_NAME_MAX,
  chatListPhone,
} from './chat-lists';

export const chatListNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(CHAT_LIST_NAME_MAX)
  .refine((name) => normalizeArabic(name).length > 0);

/** POST /chat-lists and PATCH /chat-lists/:id. */
export const chatListBodySchema = z.object({ name: chatListNameSchema });
export type ChatListBody = z.infer<typeof chatListBodySchema>;

export const chatListErrorSchema = z.enum(CHAT_LIST_ERRORS);
export type ChatListError = z.infer<typeof chatListErrorSchema>;

export const chatListAutoRuleSchema = z.enum(CHAT_LIST_AUTO_RULES);
export type ChatListAutoRule = z.infer<typeof chatListAutoRuleSchema>;

/** GET /chat-lists, oldest first: `count` = its chats; `auto_rule` null = a hand-kept list. */
export const chatListSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  auto_rule: chatListAutoRuleSchema.nullable(),
});
export type ChatList = z.infer<typeof chatListSchema>;

/** A list a chat is in (GET /threads/:phone → `lists`). */
export const chatListRefSchema = chatListSchema.pick({ id: true, name: true });
export type ChatListRef = z.infer<typeof chatListRefSchema>;

/** A `:id` that is not a uuid cannot name a list (the api answers 404 list_not_found). */
export const chatListIdParam = z.uuid();

/** `:phone` is an E.164 number in any spelling chatListPhone accepts (else 400 invalid_phone). */
export const chatListPhoneParam = z.string().transform(chatListPhone).pipe(z.string());

export const chatListParamsSchema = z.object({ id: chatListIdParam });
export const chatListThreadParamsSchema = z.object({
  id: chatListIdParam,
  phone: chatListPhoneParam,
});
