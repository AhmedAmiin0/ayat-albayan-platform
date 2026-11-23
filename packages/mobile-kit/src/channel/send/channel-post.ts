import { apiErrorCode, channelMessagesPath } from '@ab/client-core';
import type { ChannelAttachmentInput, ChannelPost } from '@ab/shared';
import { apiSend } from '../../lib/http/api';
import { t } from '../../lib/i18n/i18n';
import type { ChannelRef } from '../channel-api';

export interface ChannelSendInput {
  /** Trimmed; '' for a file without a caption. */
  body: string;
  clientId: string;
  /** The message it answers. */
  replyToId?: string;
  attachment?: ChannelAttachmentInput;
}

/** POST …/messages's body (channelPostSchema): optional fields only when set. */
function postBody(input: ChannelSendInput): Partial<ChannelPost> {
  return {
    body: input.body,
    client_id: input.clientId,
    ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
    ...(input.attachment ? { attachment: input.attachment } : {}),
  };
}

export const postChannelMessage = (ref: ChannelRef, input: ChannelSendInput): Promise<unknown> =>
  apiSend('POST', channelMessagesPath(ref), postBody(input));

/** The API's refusal in words, else a generic send failure. */
export function sendErrorText(e: unknown): string {
  const errors: Readonly<Record<string, string>> = t.studentChannel.actions.errors;
  return errors[apiErrorCode(e) ?? ''] ?? t.studentChannel.sendFailed;
}
