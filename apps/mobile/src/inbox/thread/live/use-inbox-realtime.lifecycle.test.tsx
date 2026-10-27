import { INBOX_INACTIVE_LEAVE_MS, liveInterval } from '@ab/client-core';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { queryClient as client } from '@/core/lib/query/query-client';
import { inboxLive } from './inbox-live';
import { useInboxRealtime } from './use-inbox-realtime';

// Owner 2026-10-27: close the connection when it is not needed, no leaks. Mocked client, no socket.

type Status = (s: string) => void;
const mockRt = { joins: [] as { status?: Status }[], removed: [] as unknown[] };
const mockSupabase = {
  channel: jest.fn(() => {
    const ch: { status?: Status; on: () => typeof ch; subscribe: (cb: Status) => typeof ch } = {
      on: () => ch,
      subscribe: (cb) => ((ch.status = cb), ch),
    };
    mockRt.joins.push(ch);
    return ch;
  }),
  removeChannel: jest.fn(async (ch: unknown) => void mockRt.removed.push(ch)),
  getChannels: jest.fn(() => mockRt.joins.filter((c) => !mockRt.removed.includes(c))),
  realtime: { setAuth: jest.fn(async () => undefined), disconnect: jest.fn(async () => 'ok') },
};
jest.mock('@/core/lib/http/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

const listeners = new Set<(s: AppStateStatus) => void>();
const open = () => mockRt.joins.length - mockRt.removed.length;
const flip = (state: AppStateStatus) =>
  act(async () => {
    Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
    listeners.forEach((l) => l(state));
  });
const settle = () => act(async () => undefined);
/** Timers still pending once React's own 0 ms work has run (a throttle or a leave waits ≥ 1 s). */
async function timers(): Promise<number> {
  await act(() => jest.advanceTimersByTimeAsync(0));
  return jest.getTimerCount();
}
const OFFLINE = 15_000;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockRt.joins = [];
  mockRt.removed = [];
  listeners.clear();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, cb) => {
    listeners.add(cb);
    return { remove: () => void listeners.delete(cb) };
  });
});
afterEach(() => jest.useRealTimers());

test('mount → unmount 20 times: no channel, listener, timer or registry key left; not live', async () => {
  for (let i = 0; i < 20; i += 1) {
    const hook = await renderHook(() => useInboxRealtime(true));
    await settle();
    mockRt.joins.at(-1)?.status?.('SUBSCRIBED');
    await hook.unmount();
    await settle();
  }
  expect([mockRt.joins.length, mockSupabase.removeChannel.mock.calls.length, open()]).toEqual([20, 20, 0]);
  expect(mockSupabase.realtime.disconnect).toHaveBeenCalledTimes(20);
  expect([listeners.size, await timers(), inboxLive.isLive()]).toEqual([0, 0, false]);
  const probe = { chat: jest.fn(), list: jest.fn(), badge: jest.fn() };
  const unbind = inboxLive.bind(probe);
  inboxLive.resync(); // registry empty: only the badge, no watched key
  unbind();
  expect([probe.chat.mock.calls.length, probe.list.mock.calls.length, await timers()]).toEqual([0, 0, 0]);
});

test('background leaves at once (polls back to the offline rate); foreground: one join, one resync', async () => {
  const release = inboxLive.watch('list');
  const hook = await renderHook(() => useInboxRealtime(true));
  await settle();
  mockRt.joins[0]?.status?.('SUBSCRIBED');
  expect(liveInterval(inboxLive.isLive(), OFFLINE)).not.toBe(OFFLINE);
  await flip('background');
  await settle();
  expect([open(), liveInterval(inboxLive.isLive(), OFFLINE), await timers()]).toEqual([0, OFFLINE, 0]);
  const lists = jest.mocked(client.refetchQueries).mock.calls.length;
  await flip('active');
  await settle();
  expect([mockRt.joins.length, open()]).toEqual([2, 1]);
  mockRt.joins[1]?.status?.('SUBSCRIBED');
  expect(jest.mocked(client.refetchQueries).mock.calls.length).toBe(lists + 1);
  release();
  await hook.unmount();
});

test('iOS inactive leaves only after the grace; back in time keeps the channel and resyncs once', async () => {
  const hook = await renderHook(() => useInboxRealtime(true));
  await settle();
  await flip('inactive');
  await act(() => jest.advanceTimersByTimeAsync(INBOX_INACTIVE_LEAVE_MS - 1));
  await flip('active');
  expect([mockRt.joins.length, open()]).toEqual([1, 1]);
  await flip('inactive');
  await act(() => jest.advanceTimersByTimeAsync(INBOX_INACTIVE_LEAVE_MS));
  expect(open()).toBe(0);
  await hook.unmount();
});

test('rapid background / foreground flips never hold two channels or a dangling join', async () => {
  const hook = await renderHook(() => useInboxRealtime(true));
  for (let i = 0; i < 10; i += 1) {
    await flip('background');
    await flip('active');
    expect(open()).toBeLessThanOrEqual(1);
  }
  await settle();
  expect(open()).toBe(1);
  await hook.unmount();
  await settle();
  expect([open(), listeners.size, await timers()]).toEqual([0, 0, 0]);
});
