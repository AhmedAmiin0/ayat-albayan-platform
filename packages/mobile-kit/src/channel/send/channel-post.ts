import { apiErrorCode, channelWriterOf, type ChannelPostAsk } from '@ab/client-core';
import type { ChannelAttachmentInput, ChannelMessageView } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';
import { channelWrites, type ChannelRef } from '../channel-api';

export interface ChannelSendInput {
  /** Trimmed; '' for a file without a caption. */
  body: string;
  clientId: string;
  /** The message it answers. */
  replyToId?: string;
  attachment?: ChannelAttachmentInput;
}

/** The send's body (channelPostSchema): optional fields only when set. */
function postBody(input: ChannelSendInput): ChannelPostAsk['post'] {
  return {
    body: input.body,
    client_id: input.clientId,
    ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
    ...(input.attachment ? { attachment: input.attachment } : {}),
  };
}

export const postChannelMessage = (
  { audience, studentId }: ChannelRef,
  input: ChannelSendInput,
): Promise<ChannelMessageView> =>
  channelWrites[channelWriterOf(audience)].post({ studentId, post: postBody(input) });

/** The API's refusal in words, else a generic send failure. */
export function sendErrorText(e: unknown): string {
  const errors: Readonly<Record<string, string>> = t.studentChannel.actions.errors;
  return errors[apiErrorCode(e) ?? ''] ?? t.studentChannel.sendFailed;
}
