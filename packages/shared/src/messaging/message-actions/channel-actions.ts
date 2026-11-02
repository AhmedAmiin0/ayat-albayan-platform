import type { ChannelMessageView } from '../channel/channel.js';

// Edit and delete in the in-app channel (owner 2026-10-30: «also add edit and delete message
// ability»).
// The sender edits their own text within 15 minutes and deletes their own message for everyone
// within
// 48 hours; an admin (moderation) deletes any message. The API enforces the same rule (rule 9).

export const CHANNEL_EDIT_WINDOW_MS = 15 * 60_000;
export const CHANNEL_DELETE_WINDOW_MS = 48 * 3_600_000;

/**
 * What the rule reads of a message: whose it is, when it was written, whether it is already gone.
 */
export type ChannelActionMessage = Pick<ChannelMessageView, 'mine' | 'created_at' | 'deleted'>;

export interface ChannelActionInput {
  message: ChannelActionMessage;
  /** An admin's view (student_channels.monitor as admin): deletes any message, never edits. */
  moderator: boolean;
  now: Date;
}

export interface ChannelActions {
  edit: boolean;
  delete: boolean;
}

const within = (input: ChannelActionInput, windowMs: number): boolean =>
  input.now.getTime() - Date.parse(input.message.created_at) <= windowMs;

/** «تعديل» / «حذف للجميع» for this viewer, now. A deleted message offers nothing. */
export function channelActions(input: ChannelActionInput): ChannelActions {
  const { message: m } = input;
  if (m.deleted) return { edit: false, delete: false };
  if (input.moderator) return { edit: false, delete: true };
  return {
    edit: m.mine && within(input, CHANNEL_EDIT_WINDOW_MS),
    delete: m.mine && within(input, CHANNEL_DELETE_WINDOW_MS),
  };
}
