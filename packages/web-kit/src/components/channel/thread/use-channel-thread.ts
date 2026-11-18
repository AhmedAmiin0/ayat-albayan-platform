import { channelMode, liveChannelId } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { channelQuery, type ChannelRef } from '@ab/web-kit/components/channel/api';
import { useChannelLive } from '@ab/web-kit/components/channel/use-channel-live';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useChannelSend } from './use-channel-send';
import { useMarkRead } from './use-mark-read';

/**
 * One student's thread: the pages (live over the socket, polled as the fallback), what this
 * viewer may do (channelMode), the send, the read mark (visible tab only) and the one ticking
 * clock every bubble and the presence line share (not new Date() in render, which the compiler
 * would keep).
 */
export function useChannelThread(refs: ChannelRef) {
  const { audience, studentId } = refs;
  const [live, setLive] = useState(false);
  const query = useInfiniteQuery(channelQuery({ audience, studentId }, live));
  const first = query.data?.pages[0];
  const mode = channelMode(audience, first);
  useChannelLive(refs, { channelId: liveChannelId(mode, first), onLive: setLive });
  const newest = first?.messages.at(-1);
  useMarkRead(refs, { enabled: mode === 'write', at: newest?.created_at });
  const send = useChannelSend(refs);
  return { query, first, mode, newest, send, now: useNow() };
}
