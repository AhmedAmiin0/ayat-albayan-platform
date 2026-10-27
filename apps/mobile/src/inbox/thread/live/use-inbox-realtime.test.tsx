import { chatLiveKey } from '@ab/client-core';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { queryClient as client } from '@/core/lib/query/query-client';
import { threadPollKey } from '../hooks/thread-poll';
import { inboxLive } from './inbox-live';
import { useInboxRealtime } from './use-inbox-realtime';

// The staff inbox's realtime nudge (docs/12 §15): events trigger the same reads the polls run, throttled.

const OPEN = '+966500000001';
const OTHER = '+966500000002';
const mockHooks: { status?: (s: string) => void; event?: (m: { payload: unknown }) => void } = {};
const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
  on: jest.fn((_t: string, _f: unknown, cb: (m: { payload: unknown }) => void) => ((mockHooks.event = cb), mockChannel)),
  subscribe: jest.fn((cb: (s: string) => void) => ((mockHooks.status = cb), mockChannel)),
};
const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(async () => 'ok'),
  realtime: { setAuth: jest.fn(async () => undefined) },
};
jest.mock('@/core/lib/http/supabase', () => ({
  get supabase() {
    return mockSupabase; // read at use, after this file's consts exist
  },
}));
let mockAppChange: ((s: AppStateStatus) => void) | undefined;
const appIs = (state: AppStateStatus) => Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });

async function mount(enabled = true) {
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const hook = await renderHook(() => useInboxRealtime(enabled));
  await act(async () => undefined); // setAuth, then the join
  const chats = () => refetch.mock.calls.filter(([f]) => f?.queryKey?.[0] === 'thread-poll').map(([f]) => f?.queryKey?.[1]);
  const lists = () => refetch.mock.calls.filter(([f]) => f?.queryKey?.[1] === 'list').length;
  return { hook, chats, lists, badges: () => invalidate.mock.calls.length };
}
const send = (phone: string) => act(async () => mockHooks.event?.({ payload: { phone } }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  appIs('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, cb) => {
    mockAppChange = cb;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.useRealTimers());

test('joins the private topic once with the session token set first', async () => {
  const { hook } = await mount();
  expect(mockSupabase.realtime.setAuth).toHaveBeenCalledTimes(1);
  expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
  expect(mockSupabase.channel).toHaveBeenCalledWith('inbox:staff', { config: { private: true } });
  expect(mockChannel.on).toHaveBeenCalledWith('broadcast', { event: 'thread_changed' }, expect.any(Function));
  await hook.unmount();
  expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
});

test('disabled (no inbox.read): never subscribes', async () => {
  await mount(false);
  expect(mockSupabase.channel).not.toHaveBeenCalled();
});

test('an event for the open chat re-reads its newest page once; another phone only the list and the badge', async () => {
  const release = [inboxLive.watch(chatLiveKey(OPEN)), inboxLive.watch('list')];
  const m = await mount();
  await send(OPEN);
  expect(m.chats()).toEqual([OPEN]);
  expect([m.lists(), m.badges()]).toEqual([1, 1]);
  await act(() => jest.advanceTimersByTimeAsync(5_000));
  await send(OTHER);
  expect(m.chats()).toEqual([OPEN]);
  expect(m.lists()).toBe(2);
  expect(threadPollKey(OPEN)).toEqual(['thread-poll', OPEN]);
  release.forEach((r) => r());
  await m.hook.unmount();
});

test('a burst of 20 events → at most 2 fetches per target', async () => {
  const release = [inboxLive.watch(chatLiveKey(OPEN)), inboxLive.watch('list')];
  const m = await mount();
  for (let i = 0; i < 20; i += 1) await send(OPEN);
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect([m.chats().length, m.lists(), m.badges()]).toEqual([2, 2, 2]);
  release.forEach((r) => r());
  await m.hook.unmount();
});

test('SUBSCRIBED → live, and one refresh of what is on screen; reconnect and foreground refresh once more', async () => {
  const release = inboxLive.watch('list');
  const m = await mount();
  await act(async () => mockHooks.status?.('SUBSCRIBED'));
  expect([inboxLive.isLive(), m.lists()]).toEqual([true, 1]);
  await act(async () => mockHooks.status?.('CHANNEL_ERROR'));
  expect(inboxLive.isLive()).toBe(false);
  await act(() => jest.advanceTimersByTimeAsync(5_000));
  await act(async () => mockHooks.status?.('SUBSCRIBED'));
  expect(m.lists()).toBe(2);
  await act(() => jest.advanceTimersByTimeAsync(5_000));
  await act(async () => mockAppChange?.('active'));
  expect(m.lists()).toBe(3);
  release();
  await m.hook.unmount();
  expect(inboxLive.isLive()).toBe(false);
});

test('in the background an event fetches nothing', async () => {
  const release = inboxLive.watch(chatLiveKey(OPEN));
  const m = await mount();
  appIs('background');
  await send(OPEN);
  expect([m.chats().length, m.badges()]).toEqual([0, 0]);
  release();
  await m.hook.unmount();
});
