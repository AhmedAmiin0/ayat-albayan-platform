import { CALLS_KEY } from './calls-api.js';

// A nudge, not a data path (docs/28 §4): a change to a wa_calls row the user may read (RLS) makes the
// calls queries re-read through the API. The shapes are the part of supabase-js's realtime used here.

const CHANGES = { event: '*', schema: 'public', table: 'wa_calls' } as const;

interface RealtimeChannelLike {
  on(type: 'postgres_changes', filter: typeof CHANGES, callback: () => void): RealtimeChannelLike;
  subscribe(): RealtimeChannelLike;
}

export interface RealtimeLike {
  channel(topic: string): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): Promise<unknown>;
}

/** The calls queries a change re-reads: all but the config. */
export const isCallsData = (query: { queryKey: readonly unknown[] }): boolean =>
  query.queryKey[0] === CALLS_KEY[0] && query.queryKey[1] !== 'config';

/**
 * Listens to wa_calls on a topic of its own (a quick resubscribe never reuses the channel still leaving);
 * returns the unsubscribe. Realtime unreachable or missing: nothing, the polls keep working.
 */
export function subscribeCalls(realtime: RealtimeLike, onChange: () => void): () => void {
  let channel: RealtimeChannelLike | null = null;
  try {
    if (typeof realtime.channel !== 'function') return () => undefined;
    channel = realtime.channel(`wa_calls:${Math.random().toString(36).slice(2)}`).on('postgres_changes', CHANGES, onChange).subscribe();
  } catch {
    channel = null;
  }
  return () => {
    if (channel) void realtime.removeChannel(channel).catch(() => undefined);
  };
}
