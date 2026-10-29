import type { ChannelAudience } from './channels.js';
import { CHANNEL_REFRESH_MS, CHANNEL_WRITES } from './channels.js';

// Realtime for the student channel (owner 2026-10-29: «chat between teacher and student will be using
// socket it will not use whatsapp»): Supabase Realtime postgres_changes on channel_messages, filtered by
// the channel, told only to the viewers RLS lets read it (can_read_channel, migration 961). A nudge, not a
// data path: a new row makes the thread re-read through the API. The poll stays as the fallback.

/** The poll while the socket is live: a safety net only (a missed event, a return from the background). */
export const CHANNEL_LIVE_FALLBACK_MS = 60_000;

/** The thread's poll: slow while the socket is live, the old 15 s while it is down or not joined. */
export const channelPollMs = (live: boolean): number => (live ? CHANNEL_LIVE_FALLBACK_MS : CHANNEL_REFRESH_MS);

const changesOf = (channelId: string) =>
  ({ event: 'INSERT', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${channelId}` }) as const;

interface LiveChannelLike {
  on(type: 'postgres_changes', filter: ReturnType<typeof changesOf>, callback: () => void): LiveChannelLike;
  subscribe(callback?: (status: string) => void): LiveChannelLike;
}

export interface ChannelRealtimeLike {
  channel(topic: string): LiveChannelLike;
  removeChannel(channel: LiveChannelLike): Promise<unknown>;
}

interface LiveInput {
  channelId: string;
  /** A message was inserted in this channel (re-read the thread). */
  onMessage: () => void;
  /** Joined (true) or down (false): the poll's interval follows it. */
  onLive: (live: boolean) => void;
}

/**
 * Joins `channel_messages` of one channel on a topic of its own; returns the leave. Realtime missing or
 * failing: onLive(false) and the poll carries on (CHANNEL_REFRESH_MS).
 */
export function subscribeChannelMessages(realtime: ChannelRealtimeLike, input: LiveInput): () => void {
  let channel: LiveChannelLike | null = null;
  try {
    if (typeof realtime.channel !== 'function' || !input.channelId) return () => undefined;
    const topic = `channel_messages:${input.channelId}:${Math.random().toString(36).slice(2)}`;
    channel = realtime
      .channel(topic)
      .on('postgres_changes', changesOf(input.channelId), input.onMessage)
      .subscribe((status) => input.onLive(status === 'SUBSCRIBED'));
  } catch {
    channel = null;
    input.onLive(false);
  }
  return () => {
    input.onLive(false);
    if (channel) void realtime.removeChannel(channel).catch(() => undefined);
  };
}

/**
 * What the thread shows for this viewer: `closed` = a participant before the subscription and the
 * teacher's assignment (the closed line, no composer); `write` = the composer; `read` = a monitor.
 */
export function channelMode(audience: ChannelAudience, page: { open: boolean; read_only: boolean } | undefined): 'closed' | 'write' | 'read' {
  if (!CHANNEL_WRITES[audience] || page?.read_only === true) return 'read';
  return page?.open === false ? 'closed' : 'write';
}

/** The channel the socket joins: none while closed or still loading ('' joins nothing). */
export const liveChannelId = (mode: 'closed' | 'write' | 'read', page: { channel_id: string } | undefined): string =>
  mode === 'closed' ? '' : (page?.channel_id ?? '');
