import { channelEditError, channelKey, channelMessagePath } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import type { ChannelRef } from '@/student-file/channel/channel-queries';

/** The API's refusal in words: a window passed, not yours, already deleted; else a failure. */
export function channelChangeError(e: unknown): string {
  const body = e instanceof ApiError ? e.body : null;
  const code: unknown =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : null;
  const known = channelEditError(typeof code === 'string' ? code : undefined);
  return known ? t.studentChannel.actions.errors[known] : t.studentChannel.actions.failed;
}

/**
 * «تعديل» (PATCH) and «حذف للجميع» (DELETE) of one message (owner 2026-10-30). The thread and the
 * teacher's list re-read after either; the other side hears it over the channel's socket.
 */
export function useChannelChange(ref: ChannelRef) {
  const client = useQueryClient();
  const settle = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: channelKey(ref.audience, ref.studentId) }),
      client.invalidateQueries({ queryKey: ['channel', 'teacher', 'list'] }),
    ]);
  const path = (messageId: string) => channelMessagePath({ ...ref, messageId }) ?? '';
  const edit = useMutation({
    mutationFn: (input: { id: string; body: string }) =>
      apiSend<ChannelMessageView>('PATCH', path(input.id), { body: input.body }),
    onSettled: settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend<ChannelMessageView>('DELETE', path(id)),
    onSettled: settle,
  });
  return { edit, remove };
}
