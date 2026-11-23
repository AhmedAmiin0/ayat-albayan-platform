import { channelKey } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { channelCountKeys, type ChannelRef } from '#/components/channel/api.ts';
import { deleteChannelMessage, editChannelMessage, editProblem } from './edit-api';

/**
 * One bubble's edit and delete: the thread and the counts re-read after either; `problem` in words.
 */
export function useChannelEdits(ref: ChannelRef & { messageId: string }) {
  const client = useQueryClient();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: channelKey(ref.audience, ref.studentId) }),
      ...channelCountKeys(ref.studentId).map((queryKey) => client.invalidateQueries({ queryKey })),
    ]);
  const edit = useMutation({
    mutationFn: (body: string) => editChannelMessage({ ...ref, body }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => deleteChannelMessage(ref), onSuccess: refresh });
  const failed = edit.error ?? remove.error;
  return { edit, remove, problem: failed ? editProblem(failed) : null };
}
