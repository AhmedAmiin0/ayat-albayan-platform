import { channelKey, channelMode, liveChannelId } from '@ab/client-core';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  CHANNEL_COUNT_KEYS,
  channelQuery,
  sendChannelMessage,
  type ChannelRef,
} from '@/features/teaching/student-channel/api';
import { useChannelLive } from '@/features/teaching/student-channel/use-channel-live';
import { useNow } from '@/lib/time/use-now';
import { useMarkRead } from './use-mark-read';

/**
 * One student's thread: the pages (live over the socket, polled as the fallback), what this
 * viewer may do (channelMode), the send, the read mark (visible tab only) and the one ticking
 * clock every bubble and the presence line share (not new Date() in render, which the compiler
 * would keep).
 */
export function useChannelThread(refs: ChannelRef) {
  const { audience, studentId } = refs;
  const client = useQueryClient();
  const [live, setLive] = useState(false);
  const query = useInfiniteQuery(channelQuery({ audience, studentId }, live));
  const first = query.data?.pages[0];
  const mode = channelMode(audience, first);
  useChannelLive(refs, { channelId: liveChannelId(mode, first), onLive: setLive });
  const newest = first?.messages.at(-1);
  useMarkRead(refs, { enabled: mode === 'write', at: newest?.created_at });
  const send = useMutation({
    mutationFn: (body: string) => sendChannelMessage({ audience, studentId, body }),
    onSettled: () =>
      Promise.all(
        [channelKey(audience, studentId), ...CHANNEL_COUNT_KEYS].map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      ),
  });
  return { query, first, mode, newest, send, now: useNow() };
}
