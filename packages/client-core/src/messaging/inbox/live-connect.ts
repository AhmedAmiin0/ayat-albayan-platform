import { INBOX_LIVE_EVENT, INBOX_LIVE_TOPIC } from './inbox-live.js';
import type { InboxLive, LiveTargets } from './live-store.js';

/** The slice of a SupabaseClient this uses (no dependency on supabase-js here). */
export interface LiveChannel {
  on(type: 'broadcast', filter: { event: string }, callback: (message: { payload?: unknown }) => void): LiveChannel;
  subscribe(callback: (status: string) => void): LiveChannel;
}
export interface LiveClient {
  channel(topic: string, options: { config: { private: boolean } }): LiveChannel;
  removeChannel(channel: LiveChannel): Promise<unknown>;
  /** Every feature's channels on the shared socket (web calls' 'wa_calls:…' too). */
  getChannels(): readonly unknown[];
  realtime: { setAuth(token?: string | null): Promise<void>; disconnect(): Promise<unknown> };
}

/**
 * A leaving channel (removeChannel waits for the server's reply): realtime-js hands the same topic's
 * channel back until it is gone, and subscribe() on it does nothing. A new join waits for it.
 */
let leaving: Promise<void> = Promise.resolve();

/**
 * Leaves, then closes the socket when no other feature holds a channel on it. realtime-js 2.117 only
 * schedules that close 2 × heartbeat (50 s) after the last channel goes, keeping the socket and its
 * heartbeat alive in the background meanwhile. Settles with nothing: the module keeps no closure.
 */
async function leave(client: LiveClient, channel: LiveChannel): Promise<void> {
  try {
    await client.removeChannel(channel);
    if (client.getChannels().length === 0) await client.realtime.disconnect();
  } catch {
    // Gone either way: the next join opens a fresh socket.
  }
}

/**
 * Joins the private topic as the signed-in user and feeds `live`; returns the stop (unmount, sign-out).
 * setAuth() first: the join carries the session's JWT (the policy reads it), not the anon key a join
 * could otherwise go out with before supabase-js has read the session. supabase-js keeps it current
 * itself afterwards (TOKEN_REFRESHED → realtime.setAuth → access_token pushed to joined channels).
 * Never throws: without realtime the apps simply keep polling at their old rate.
 */
export function connectInboxLive(client: LiveClient, live: InboxLive, targets: LiveTargets): () => void {
  let stopped = false;
  let channel: LiveChannel | null = null;
  const unbind = live.bind(targets);
  const status = (s: string) => {
    if (stopped) return;
    live.setLive(s === 'SUBSCRIBED');
    if (s === 'SUBSCRIBED') live.resync();
  };
  const join = () => {
    if (stopped) return;
    try {
      channel = client
        .channel(INBOX_LIVE_TOPIC, { config: { private: true } })
        .on('broadcast', { event: INBOX_LIVE_EVENT }, (message) => {
          if (!stopped) live.changed(message.payload);
        })
        .subscribe(status);
    } catch {
      channel = null;
    }
  };
  leaving
    .then(() => client.realtime.setAuth())
    .then(join, join);
  return () => {
    stopped = true;
    unbind();
    if (channel) leaving = leave(client, channel);
    channel = null;
  };
}
