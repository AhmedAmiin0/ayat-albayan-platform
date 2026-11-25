import { channelEditError, channelMessagePath, type ChannelEditError } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { z } from 'zod';
import { ApiError, apiSend } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';

// PATCH and DELETE of a channel message; the API checks every rule.

interface MessageRef extends ChannelRef {
  messageId: string;
}

export const editChannelMessage = (ref: MessageRef & { body: string }) =>
  apiSend<ChannelMessageView>('PATCH', channelMessagePath(ref), { body: ref.body });

export const deleteChannelMessage = (ref: MessageRef) =>
  apiSend<ChannelMessageView>('DELETE', channelMessagePath(ref));

/** The API's error body: only its code is read. */
const refusalSchema = z.object({ code: z.string() });

/** The chat's own refusals: a read-only seat (403) and a closed channel (409). */
const THREAD_REFUSALS = ['channel_read_only', 'channel_not_open'] as const;
type ThreadRefusal = (typeof THREAD_REFUSALS)[number];
const threadRefusal = (code: string | undefined): ThreadRefusal | null =>
  THREAD_REFUSALS.find((c) => c === code) ?? null;

const codeOf = (e: unknown): string | undefined =>
  e instanceof ApiError ? refusalSchema.safeParse(e.body).data?.code : undefined;

/**
 * The API's refusal in words (a closed window, not yours, already deleted, a read-only seat, a
 * closed chat); else «try again».
 */
export function editProblem(e: unknown): string {
  const code = codeOf(e);
  const known = channelEditError(code) ?? threadRefusal(code);
  const errors: Readonly<Record<ChannelEditError | ThreadRefusal, string>> =
    t.studentChannel.actions.errors;
  return known ? errors[known] : t.studentChannel.actions.failed;
}
