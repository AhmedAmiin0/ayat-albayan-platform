import { channelMode, isPending, liveChannelId } from '@ab/client-core';
import { useState } from 'react';
import { useChannel, type ChannelRef } from './channel-api';
import { useChannelLive } from './use-channel-live';
import { useMarkRead } from './use-mark-read';

/**
 * The thread's data (docs/31 §2): its pages, live over the socket once joined and polled as the
 * fallback; its mode (write, read, closed: channelMode); its newest page; and, for a participant,
 * the read mark up to the newest message.
 */
export function useChannelThread(refs: ChannelRef) {
  const [live, setLive] = useState(false);
  const query = useChannel(refs, live);
  const first = query.data?.pages[0];
  const mode = channelMode(refs.audience, first);
  // The API's newest time, never a pending row's (the phone's clock).
  const sent = first?.messages.filter((m) => !isPending(m));
  useChannelLive(refs, { channelId: liveChannelId(mode, first), onLive: setLive });
  useMarkRead(refs, { enabled: mode === 'write', at: sent?.at(-1)?.created_at });
  return { query, mode, first };
}
