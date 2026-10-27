import { describe, expect, it, vi } from 'vitest';
import { connectInboxLive, type LiveChannel, type LiveClient } from './live-connect.js';
import { createInboxLive } from './live-store.js';

function fakeClient(auth: Promise<void> = Promise.resolve()) {
  const hooks: { status?: (s: string) => void; event?: (m: { payload?: unknown }) => void } = {};
  const channel: LiveChannel = {
    on: vi.fn((_type, _filter, cb) => ((hooks.event = cb), channel)),
    subscribe: vi.fn((cb) => ((hooks.status = cb), channel)),
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
    realtime: { setAuth: vi.fn(() => auth) },
  } satisfies LiveClient;
  return { client, channel, hooks };
}

const targets = () => ({ chat: vi.fn(), list: vi.fn(), badge: vi.fn() });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('connectInboxLive', () => {
  it('sets the realtime auth, then joins the private topic once', async () => {
    const { client, hooks } = fakeClient();
    connectInboxLive(client, createInboxLive(), targets());
    expect(client.channel).not.toHaveBeenCalled();
    await flush();
    expect(client.realtime.setAuth).toHaveBeenCalledWith();
    expect(client.channel).toHaveBeenCalledTimes(1);
    expect(client.channel).toHaveBeenCalledWith('inbox:staff', { config: { private: true } });
    expect(hooks.status).toBeDefined();
  });

  it('SUBSCRIBED → live and one resync; an error, a timeout or a close → polling again', async () => {
    const { client, hooks } = fakeClient();
    const live = createInboxLive();
    const t = targets();
    connectInboxLive(client, live, t);
    await flush();
    hooks.status?.('SUBSCRIBED');
    expect([live.isLive(), t.badge.mock.calls.length]).toEqual([true, 1]);
    for (const s of ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']) {
      hooks.status?.('SUBSCRIBED');
      hooks.status?.(s);
      expect(live.isLive()).toBe(false);
    }
  });

  it('an event reaches the store; stop removes the channel and ignores late callbacks', async () => {
    const { client, channel, hooks } = fakeClient();
    const live = createInboxLive();
    const t = targets();
    const stop = connectInboxLive(client, live, t);
    await flush();
    hooks.event?.({ payload: { phone: '+966500000001' } });
    expect(t.badge).toHaveBeenCalledTimes(1);
    stop();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    hooks.status?.('SUBSCRIBED');
    expect(live.isLive()).toBe(false);
  });

  it('stopped before the auth settles: never joins; a failed setAuth still joins (the policy decides)', async () => {
    const early = fakeClient();
    connectInboxLive(early.client, createInboxLive(), targets())();
    await flush();
    expect(early.client.channel).not.toHaveBeenCalled();
    const failed = fakeClient(Promise.reject(new Error('no session')));
    connectInboxLive(failed.client, createInboxLive(), targets());
    await flush();
    expect(failed.client.channel).toHaveBeenCalledTimes(1);
  });

  it('a remount waits for the previous channel to leave before joining the topic again', async () => {
    const first = fakeClient();
    let left: (v: string) => void = () => undefined;
    first.client.removeChannel.mockImplementation(() => new Promise<string>((r) => (left = r)));
    const stop = connectInboxLive(first.client, createInboxLive(), targets());
    await flush();
    stop();
    const second = fakeClient();
    connectInboxLive(second.client, createInboxLive(), targets());
    await flush();
    expect(second.client.channel).not.toHaveBeenCalled();
    left('ok');
    await flush();
    expect(second.client.channel).toHaveBeenCalledTimes(1);
  });
});
