import {
  CHANNEL_WRITES,
  channelKey,
  channelPollMs,
  channelMessagesPath,
  channelReadPath,
  olderCursor,
  type ChannelAudience,
} from '@ab/client-core';
import { channelPageSchema } from '@ab/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiFetch, apiSend } from '../lib/http/api';
import { useScreenFocused } from '../ui/connecting/use-screen-focus';

// The student channel on the phone (docs/31 §2), the same for the teacher, the family and the
// monitors: the thread has its socket (use-channel-live) and polls only as the fallback
// (channelPollMs).

export interface ChannelRef {
  audience: ChannelAudience;
  studentId: string;
}

/** The teacher's «رسائل الطلاب» list (the staff app): a change in a thread re-reads it. */
export const TEACHER_CHANNELS_KEY = ['channel', 'teacher', 'list'] as const;

/** `live`: the thread's socket is joined, so the poll is only the fallback. */
export function useChannel({ audience, studentId }: ChannelRef, live = false) {
  const focused = useScreenFocused();
  return useInfiniteQuery({
    queryKey: channelKey(audience, studentId),
    queryFn: async ({ pageParam }) => {
      const path = channelMessagesPath({ audience, studentId, before: pageParam });
      return channelPageSchema.parse(await apiFetch(path));
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: olderCursor,
    refetchInterval: focused ? channelPollMs(live) : false,
  });
}

export function useSendChannel(ref: ChannelRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiSend('POST', channelMessagesPath(ref), { body }),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: channelKey(ref.audience, ref.studentId) }),
        client.invalidateQueries({ queryKey: TEACHER_CHANNELS_KEY }),
      ]),
  });
}

/** A participant has seen the thread up to its newest message (a monitor never marks it read). */
export function useMarkRead(ref: ChannelRef, newestAt: string | undefined) {
  const client = useQueryClient();
  const writes = CHANNEL_WRITES[ref.audience];
  useEffect(() => {
    if (!writes || !newestAt) return;
    apiSend('POST', channelReadPath(ref.audience, ref.studentId), { at: newestAt }).then(
      () => client.invalidateQueries({ queryKey: TEACHER_CHANNELS_KEY }),
      () => undefined,
    );
  }, [writes, newestAt, ref.audience, ref.studentId, client]);
}
