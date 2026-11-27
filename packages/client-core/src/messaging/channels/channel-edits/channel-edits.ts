import { channelActions, type ChannelActions, type ChannelMessageView } from '@ab/shared';
import type { ChannelMode } from '../channel-live';
import type { ChannelAudience } from '../channels';

// The API enforces the same rule; the menu only offers what it would accept now.

const NONE: ChannelActions = { edit: false, delete: false };

/**
 * Who may change a message at all: a writer on a participant's open channel, or the admin's
 * moderation. A monitor, the owning assistant on a closed chat, gets 403 channel_read_only.
 */
const mayChange = (audience: ChannelAudience, mode: ChannelMode): boolean =>
  mode === 'write' || audience === 'admin';

/**
 * What this viewer's menu offers on one bubble now: the sender's own windows, the owning
 * assistant's too, in write mode; the admin (moderation) deletes any message.
 */
export function channelBubbleActions(input: {
  audience: ChannelAudience;
  mode: ChannelMode;
  message: ChannelMessageView;
  now: Date;
}): ChannelActions {
  const actions = channelActions({
    message: input.message,
    moderator: input.audience === 'admin',
    now: input.now,
  });
  return mayChange(input.audience, input.mode) ? actions : NONE;
}

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
