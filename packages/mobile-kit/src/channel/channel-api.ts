import {
  channelCallsByAudience,
  channelKey,
  channelPollMs,
  channelWritesByAudience,
  olderCursor,
} from '@ab/client-core';
import type { ChannelAudience } from '@ab/client-core';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '../lib/http/api';
import { useScreenFocused } from '../ui/connecting/use-screen-focus';

// The student channel on the phone (docs/31 §2), the same for the teacher, the family and the
// monitors: the thread has its socket (use-channel-live) and polls only as the fallback
// (channelPollMs).

/** Each audience's reads of a chat on its own route table. */
export const channelCalls = channelCallsByAudience({ apiFetch, apiSend });

/** Each writer's send, read mark, file slot and edit (the monitor has none). */
export const channelWrites = channelWritesByAudience({ apiFetch, apiSend });

export interface ChannelRef {
  audience: ChannelAudience;
  studentId: string;
}

/** A change in a thread re-reads the teacher's list. */
export const TEACHER_CHANNELS_KEY = ['channel', 'teacher', 'list'] as const;

/** `live`: the thread's socket is joined, so the poll is only the fallback. */
export function useChannel({ audience, studentId }: ChannelRef, live = false) {
  const focused = useScreenFocused();
  return useInfiniteQuery({
    queryKey: channelKey(audience, studentId),
    queryFn: ({ pageParam }) => channelCalls[audience].page({ studentId, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: olderCursor,
    refetchInterval: focused ? channelPollMs(live) : false,
  });
}

/** After a send, an edit or a delete: the thread and the teacher's list re-read. */
export function useChannelSettle(ref: ChannelRef) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: channelKey(ref.audience, ref.studentId) }),
      client.invalidateQueries({ queryKey: TEACHER_CHANNELS_KEY }),
    ]);
}
