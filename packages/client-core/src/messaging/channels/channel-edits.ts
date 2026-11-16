import { channelActions, type ChannelActions, type ChannelMessageView } from '@ab/shared';
import { channelMessagesPath, type ChannelAudience } from './channels.js';

// «تعديل» / «حذف للجميع» in the student channel (owner 2026-10-30) for web and mobile. The API
// enforces
// the same rule; the menu only offers what it would accept now.

/**
 * PATCH (edit) / DELETE (delete for everyone) …/messages/:id, on every audience's route (the
 * owning assistant's too, owner 2026-11-16).
 */
export function channelMessagePath(input: {
  audience: ChannelAudience;
  studentId: string;
  messageId: string;
}): string {
  return `${channelMessagesPath(input)}/${input.messageId}`;
}

/**
 * What this viewer's menu offers on one bubble now: the sender's own windows, the owning
 * assistant's too; the admin (moderation) deletes any message.
 */
export function channelBubbleActions(input: {
  audience: ChannelAudience;
  message: ChannelMessageView;
  now: Date;
}): ChannelActions {
  return channelActions({
    message: input.message,
    moderator: input.audience === 'admin',
    now: input.now,
  });
}

/** GET …/messages/:id/reads: who of the chat read this message («معلومات الرسالة»). */
export const channelReadsPath = (input: {
  audience: ChannelAudience;
  studentId: string;
  messageId: string;
}): string => `${channelMessagePath(input)}/reads`;

/** POST hides, DELETE shows again («حذف من المنصة» / «إظهار» on a WhatsApp bubble). */
export const threadHidePath = (phone: string, messageId: string): string =>
  `/threads/${encodeURIComponent(phone)}/messages/${messageId}/hide`;

/** The API's refusal codes the menus explain in words; anything else is a generic failure. */
export const CHANNEL_EDIT_ERRORS = [
  'edit_window_closed',
  'delete_window_closed',
  'not_your_message',
  'message_deleted',
  'channel_read_only',
  'channel_not_open',
  'family_chat_off',
  'not_a_text_message',
] as const;
export type ChannelEditError = (typeof CHANNEL_EDIT_ERRORS)[number];

export const channelEditError = (code: string | undefined): ChannelEditError | null =>
  CHANNEL_EDIT_ERRORS.find((c) => c === code) ?? null;
