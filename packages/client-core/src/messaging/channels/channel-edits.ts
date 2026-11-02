import { channelActions, type ChannelActions, type ChannelMessageView } from '@ab/shared';
import type { ChannelAudience } from './channels.js';

// «تعديل» / «حذف للجميع» in the student channel (owner 2026-10-30) for web and mobile. The API
// enforces
// the same rule; the menu only offers what it would accept now.

const BASE: Readonly<Record<ChannelAudience, ((id: string) => string) | null>> = {
  teacher: (id) => `/teachers/me/channels/${id}`,
  portal: (id) => `/portal/students/${id}/channel`,
  admin: (id) => `/students/${id}/channel`,
  // The owning assistant only reads: no edit or delete route.
  sales: null,
};

/** PATCH (edit) / DELETE (delete for everyone) …/messages/:id; null where the audience has none. */
export function channelMessagePath(input: {
  audience: ChannelAudience;
  studentId: string;
  messageId: string;
}): string | null {
  const base = BASE[input.audience];
  return base ? `${base(input.studentId)}/messages/${input.messageId}` : null;
}

const NONE: ChannelActions = { edit: false, delete: false };

/** What this viewer's menu offers on one bubble now: the admin (moderation) deletes any message. */
export function channelBubbleActions(input: {
  audience: ChannelAudience;
  message: ChannelMessageView;
  now: Date;
}): ChannelActions {
  if (input.audience === 'sales') return NONE;
  return channelActions({
    message: input.message,
    moderator: input.audience === 'admin',
    now: input.now,
  });
}

/** POST hides, DELETE shows again («حذف من المنصة» / «إظهار» on a WhatsApp bubble). */
export const threadHidePath = (phone: string, messageId: string): string =>
  `/threads/${encodeURIComponent(phone)}/messages/${messageId}/hide`;

/** The API's refusal codes the menus explain in words; anything else is a generic failure. */
export const CHANNEL_EDIT_ERRORS = [
  'edit_window_closed',
  'delete_window_closed',
  'not_your_message',
  'message_deleted',
] as const;
export type ChannelEditError = (typeof CHANNEL_EDIT_ERRORS)[number];

export const channelEditError = (code: string | undefined): ChannelEditError | null =>
  CHANNEL_EDIT_ERRORS.find((c) => c === code) ?? null;
