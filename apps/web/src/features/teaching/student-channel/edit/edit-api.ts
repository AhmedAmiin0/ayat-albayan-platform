import { channelEditError, channelMessagePath } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { ApiError, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import type { ChannelRef } from '@/features/teaching/student-channel/api';

// «تعديل» / «حذف للجميع» (owner 2026-10-30): PATCH / DELETE …/messages/:id (the API checks every
// rule).

interface MessageRef extends ChannelRef {
  messageId: string;
}

function pathOf(ref: MessageRef): string {
  const path = channelMessagePath(ref);
  if (!path) throw new Error('no edit route for this audience');
  return path;
}

export const editChannelMessage = (ref: MessageRef & { body: string }) =>
  apiSend<ChannelMessageView>('PATCH', pathOf(ref), { body: ref.body });

export const deleteChannelMessage = (ref: MessageRef) =>
  apiSend<ChannelMessageView>('DELETE', pathOf(ref));

/** The API's refusal in words (a closed window, not yours, already deleted); else «try again». */
export function editProblem(e: unknown): string {
  const body = e instanceof ApiError ? e.body : null;
  const code: unknown =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  const known = channelEditError(typeof code === 'string' ? code : undefined);
  return known ? t.studentChannel.actions.errors[known] : t.studentChannel.actions.failed;
}
