import { describe, expect, it, vi } from 'vitest';
import { CHANNEL_LIVE_FALLBACK_MS, channelMode, channelPollMs, liveChannelId, subscribeChannelMessages, type ChannelRealtimeLike } from './channel-live.js';
import { CHANNEL_REFRESH_MS } from './channels.js';

/** A fake supabase client: records the filter, lets the test fire the status and an insert. */
function fakeRealtime() {
  const fired: { status?: (s: string) => void; insert?: () => void; filter?: unknown; topic?: string } = {};
  const channel = {
    on: vi.fn((_type: string, filter: unknown, cb: () => void) => {
      fired.filter = filter;
      fired.insert = cb;
      return channel;
    }),
    subscribe: vi.fn((cb?: (s: string) => void) => {
      if (cb) fired.status = cb;
      return channel;
    }),
  };
  const realtime = {
    channel: vi.fn((topic: string) => {
      fired.topic = topic;
      return channel;
    }),
    removeChannel: vi.fn(async () => 'ok'),
  };
  return { realtime: realtime as unknown as ChannelRealtimeLike, raw: realtime, fired };
}

describe('subscribeChannelMessages (owner 2026-10-29: the socket, never WhatsApp)', () => {
  it('changes of this channel only (sent, edited, deleted); live once joined, down on an error; each nudges', () => {
    const { realtime, raw, fired } = fakeRealtime();
    const onMessage = vi.fn();
    const onLive = vi.fn();
    const leave = subscribeChannelMessages(realtime, { channelId: 'c1', onMessage, onLive });
    expect(fired.filter).toEqual({ event: '*', schema: 'public', table: 'channel_messages', filter: 'channel_id=eq.c1' });
    expect(fired.topic).toMatch(/^channel_messages:c1:/);
    fired.status?.('SUBSCRIBED');
    expect(onLive).toHaveBeenLastCalledWith(true);
    fired.insert?.();
    // An edit or a delete for everyone is an UPDATE of the row: the same nudge re-reads the thread.
    fired.insert?.();
    expect(onMessage).toHaveBeenCalledTimes(2);
    fired.status?.('CHANNEL_ERROR');
    expect(onLive).toHaveBeenLastCalledWith(false);
    leave();
    expect(raw.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('no realtime or no channel id: nothing joined, the poll carries on', () => {
    const onLive = vi.fn();
    const leave = subscribeChannelMessages({} as ChannelRealtimeLike, { channelId: 'c1', onMessage: vi.fn(), onLive });
    leave();
    const { realtime, raw } = fakeRealtime();
    subscribeChannelMessages(realtime, { channelId: '', onMessage: vi.fn(), onLive })();
    expect(raw.channel).not.toHaveBeenCalled();
  });

  it('a throwing client is down, not a crash', () => {
    const onLive = vi.fn();
    const broken = { channel: () => { throw new Error('no socket'); }, removeChannel: vi.fn() } as unknown as ChannelRealtimeLike;
    expect(() => subscribeChannelMessages(broken, { channelId: 'c1', onMessage: vi.fn(), onLive })()).not.toThrow();
    expect(onLive).toHaveBeenCalledWith(false);
  });
});

describe('channelPollMs and channelMode', () => {
  it('slow poll while live, the old interval while down', () => {
    expect(channelPollMs(true)).toBe(CHANNEL_LIVE_FALLBACK_MS);
    expect(channelPollMs(false)).toBe(CHANNEL_REFRESH_MS);
  });

  it('closed for a participant before the subscription; a monitor always reads', () => {
    expect(channelMode('teacher', { open: false, read_only: false })).toBe('closed');
    expect(channelMode('portal', { open: true, read_only: false })).toBe('write');
    expect(channelMode('admin', { open: false, read_only: true })).toBe('read');
    expect(channelMode('sales', undefined)).toBe('read');
    expect(channelMode('teacher', undefined)).toBe('write');
  });

  it('the socket joins a participant’s open channel only; a monitor polls', () => {
    expect(liveChannelId('closed', { channel_id: 'c1' })).toBe('');
    expect(liveChannelId('write', { channel_id: 'c1' })).toBe('c1');
    expect(liveChannelId('read', { channel_id: 'c1' })).toBe('');
  });
});
