import { channelKey, subscribeChannelMessages } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/core/lib/http/supabase';
import { useAppActive } from '@/core/lib/presence';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import type { ChannelRef } from './channel-queries';

interface Live {
  /** The page's channel_id; '' (closed, still loading) joins nothing. */
  channelId: string;
  /** Joined or down: the thread's poll follows it (channelPollMs). */
  onLive: (live: boolean) => void;
}

/**
 * The thread's socket (owner 2026-10-29): Supabase Realtime on this channel's channel_messages (RLS decides
 * who is told); a new message re-reads the thread through the API. Joined only while the screen is shown
 * and the app is in the foreground; on the way back the poll (and TanStack's focus refetch) catch up.
 */
export function useChannelLive(ref: ChannelRef, { channelId, onLive }: Live): void {
  const client = useQueryClient();
  const focused = useScreenFocused();
  const active = useAppActive();
  const on = focused && active && channelId !== '';
  const { audience, studentId } = ref;
  useEffect(() => {
    if (!on) return;
    const onMessage = () => void client.invalidateQueries({ queryKey: channelKey(audience, studentId) });
    return subscribeChannelMessages(supabase, { channelId, onMessage, onLive });
  }, [on, channelId, audience, studentId, client, onLive]);
}
