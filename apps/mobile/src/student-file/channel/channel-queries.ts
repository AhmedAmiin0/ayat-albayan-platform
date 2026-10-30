import {
  CHANNEL_REFRESH_MS,
  CHANNEL_WRITES,
  channelKey,
  channelPollMs,
  channelMessagesPath,
  channelReadPath,
  olderCursor,
  TEACHER_CHANNELS_PATH,
  type ChannelAudience,
} from '@ab/client-core';
import type { ChannelMessageView, ChannelPage, TeacherChannelRow } from '@ab/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { apiFetch, apiSend } from '@/core/lib/http/api';

// The student channel on the phone (docs/31 §2): the list polls while shown (CHANNEL_REFRESH_MS); the thread
// has its socket (use-channel-live) and polls only as the fallback (channelPollMs).

export interface ChannelRef {
  audience: ChannelAudience;
  studentId: string;
}

/** `live`: the thread's socket is joined, so the poll is only the fallback. */
export function useChannel({ audience, studentId }: ChannelRef, live = false) {
  const focused = useScreenFocused();
  return useInfiniteQuery({
    queryKey: channelKey(audience, studentId),
    queryFn: ({ pageParam }) => apiFetch<ChannelPage>(channelMessagesPath({ audience, studentId, before: pageParam })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: olderCursor,
    refetchInterval: focused ? channelPollMs(live) : false,
  });
}

export function useSendChannel(ref: ChannelRef) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiSend<ChannelMessageView>('POST', channelMessagesPath(ref), { body }),
    onSettled: () =>
      Promise.all([client.invalidateQueries({ queryKey: channelKey(ref.audience, ref.studentId) }), client.invalidateQueries({ queryKey: ['channel', 'teacher', 'list'] })]),
  });
}

/** A participant has seen the thread up to its newest message (a monitor never marks anything read). */
export function useMarkRead(ref: ChannelRef, newestAt: string | undefined) {
  const client = useQueryClient();
  const writes = CHANNEL_WRITES[ref.audience];
  useEffect(() => {
    if (!writes || !newestAt) return;
    apiSend<unknown>('POST', channelReadPath(ref.audience, ref.studentId), { at: newestAt }).then(
      () => client.invalidateQueries({ queryKey: ['channel', 'teacher', 'list'] }),
      () => undefined,
    );
  }, [writes, newestAt, ref.audience, ref.studentId, client]);
}

export function useTeacherChannels() {
  const focused = useScreenFocused();
  return useQuery({
    queryKey: ['channel', 'teacher', 'list'],
    queryFn: () => apiFetch<TeacherChannelRow[]>(TEACHER_CHANNELS_PATH),
    refetchInterval: focused ? CHANNEL_REFRESH_MS : false,
  });
}
