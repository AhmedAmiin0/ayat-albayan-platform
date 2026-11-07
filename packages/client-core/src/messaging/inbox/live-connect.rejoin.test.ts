import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectInboxLive, type LiveChannel, type LiveClient } from './live-connect.js';
import { createInboxLive } from './live-store.js';

// docs/44 K2: a dropped channel rejoins with backoff, at once on resume / online, then resyncs.

function fakeClient() {
  const statuses: ((s: string) => void)[] = [];
  const channels: LiveChannel[] = [];
  const client = {
    channel: vi.fn(() => {
      const channel: LiveChannel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn((cb: (s: string) => void) => (statuses.push(cb), channel)),
      };
      channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
    getChannels: vi.fn(() => []),
    realtime: { setAuth: vi.fn(() => Promise.resolve()), disconnect: vi.fn(() => Promise.resolve('ok')) },
  } satisfies LiveClient;
  /** The status callback of the newest channel. */
  const status = (s: string) => statuses.at(-1)?.(s);
  return { client, channels, statuses, status };
}

const targets = () => ({ chat: vi.fn(), list: vi.fn(), badge: vi.fn() });
const flush = () => vi.advanceTimersByTimeAsync(0);
/** Lets `ms` pass, then the rejoin's setAuth → join chain settle. */
const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe('connectInboxLive: rejoin with backoff (K2)', () => {
  it('drops leave the channel and rejoin after 1 s, 2 s, 5 s, 10 s, then every 30 s', async () => {
    const f = fakeClient();
    connectInboxLive(f.client, createInboxLive(), targets());
    await flush();
    const joins = [1];
    for (const ms of [1_000, 2_000, 5_000, 10_000, 30_000, 30_000]) {
      f.status('CHANNEL_ERROR');
      await wait(ms - 1);
      joins.push(f.client.channel.mock.calls.length);
      await wait(1);
      joins.push(f.client.channel.mock.calls.length);
    }
    expect(joins).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7]);
    expect(f.client.removeChannel).toHaveBeenCalledTimes(6);
  });

  it('SUBSCRIBED again: live, one resync, and the backoff starts over at 1 s', async () => {
    const f = fakeClient();
    const live = createInboxLive();
    const t = targets();
    connectInboxLive(f.client, live, t);
    await flush();
    f.status('TIMED_OUT');
    await wait(1_000);
    f.status('CLOSED');
    await wait(2_000);
    f.status('SUBSCRIBED');
    expect([live.isLive(), t.badge.mock.calls.length]).toEqual([true, 1]);
    f.status('CHANNEL_ERROR');
    expect(live.isLive()).toBe(false);
    await wait(1_000);
    expect(f.client.channel).toHaveBeenCalledTimes(4);
  });

  it('retryNow rejoins a dropped channel at once; joined, it does nothing', async () => {
    const f = fakeClient();
    const conn = connectInboxLive(f.client, createInboxLive(), targets());
    await flush();
    f.status('SUBSCRIBED');
    conn.retryNow();
    await flush();
    expect(f.client.channel).toHaveBeenCalledTimes(1);
    f.status('CHANNEL_ERROR');
    conn.retryNow();
    await flush();
    expect(f.client.channel).toHaveBeenCalledTimes(2);
    await wait(60_000);
    expect(f.client.channel).toHaveBeenCalledTimes(2);
  });

  it('a left channel’s late status is ignored; stop cancels a pending rejoin', async () => {
    const f = fakeClient();
    const live = createInboxLive();
    const conn = connectInboxLive(f.client, live, targets());
    await flush();
    f.status('CHANNEL_ERROR');
    f.statuses[0]?.('SUBSCRIBED');
    expect(live.isLive()).toBe(false);
    conn.stop();
    await wait(60_000);
    expect(f.client.channel).toHaveBeenCalledTimes(1);
  });

  it('a join that throws is tried again with the backoff', async () => {
    const f = fakeClient();
    f.client.channel.mockImplementationOnce(() => {
      throw new Error('socket');
    });
    connectInboxLive(f.client, createInboxLive(), targets());
    await flush();
    await wait(1_000);
    expect(f.client.channel).toHaveBeenCalledTimes(2);
  });
});
