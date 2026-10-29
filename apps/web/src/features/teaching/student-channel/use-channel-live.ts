import { channelKey, subscribeChannelMessages } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/http/supabase';
import type { ChannelRef } from './api';

interface Live {
  /** The page's channel_id; '' (closed, still loading) joins nothing. */
  channelId: string;
  /** Joined or down: the thread's poll follows it (channelPollMs). */
  onLive: (live: boolean) => void;
}

/**
 * The thread's socket (owner 2026-10-29): Supabase Realtime on this channel's channel_messages (RLS decides
 * who is told); a new message re-reads the thread through the API. Never WhatsApp.
 */
export function useChannelLive(ref: ChannelRef, { channelId, onLive }: Live): void {
  const client = useQueryClient();
  const { audience, studentId } = ref;
  useEffect(() => {
    if (!channelId) return;
    const onMessage = () => void client.invalidateQueries({ queryKey: channelKey(audience, studentId) });
    return subscribeChannelMessages(supabase, { channelId, onMessage, onLive });
  }, [channelId, audience, studentId, client, onLive]);
}
