import { chatLiveKey, type LiveRow } from '@ab/client-core';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { queryClient as client } from '@/core/lib/query/query-client';
import { nudgeInboxStore, patchInboxStore } from '@/inbox/thread/local/store-session';
import { inboxLive } from './inbox-live';
import { changeLists } from './list-marks';
import { useInboxRealtime } from './use-inbox-realtime';

jest.mock('./list-marks', () => ({ changeLists: jest.fn() }));
jest.mock('@/inbox/thread/local/store-session', () => ({
  nudgeInboxStore: jest.fn(),
  patchInboxStore: jest.fn(),
}));

// docs/44 K1 on mobile: an event's ticks go into the phone store; held rows mean zero HTTP.

const OPEN = '+966500000001';
const ROW: LiveRow = { id: 'm1', s: 'delivered', d: 'outbound', at: '2026-11-07T10:00:00Z' };
const mockHooks: { event?: (m: { payload: unknown }) => void; status?: (s: string) => void } = {};
const mockChannel: { on: jest.Mock; subscribe: jest.Mock } = {
  on: jest.fn((_t: string, _f: unknown, cb: (m: { payload: unknown }) => void) => {
    mockHooks.event = cb;
    return mockChannel;
  }),
  subscribe: jest.fn((cb: (s: string) => void) => {
    mockHooks.status = cb;
    return mockChannel;
  }),
};
const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(async () => 'ok'),
  getChannels: jest.fn(() => []),
  realtime: { setAuth: jest.fn(async () => undefined), disconnect: jest.fn(async () => 'ok') },
};
jest.mock('@/core/lib/http/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

async function mount() {
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const hook = await renderHook(() => useInboxRealtime(true));
  await act(async () => undefined);
  await act(async () => mockHooks.status?.('SUBSCRIBED'));
  inboxLive.watch(chatLiveKey(OPEN));
  inboxLive.watch('list');
  jest.clearAllMocks();
  const http = () => refetch.mock.calls.length + invalidate.mock.calls.length;
  return { hook, http };
}

const push = (rows: LiveRow[]) =>
  act(async () => mockHooks.event?.({ payload: { phone: OPEN, rows } }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  inboxLive.forget(chatLiveKey(OPEN));
  inboxLive.forget('list');
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('every row held by the store: the tick moves with no request and no sync nudge', async () => {
  jest.mocked(patchInboxStore).mockResolvedValue(true);
  const { hook, http } = await mount();
  await push([ROW]);
  await act(async () => jest.runAllTimersAsync());
  expect(patchInboxStore).toHaveBeenCalledWith(OPEN, [ROW]);
  expect([http(), jest.mocked(changeLists).mock.calls.length]).toEqual([0, 0]);
  expect(nudgeInboxStore).not.toHaveBeenCalled();
  await act(async () => hook.unmount());
});

test.each([
  ['an unknown id', 'queued' as const, false],
  ['failed (the overlay shows ranked ticks only)', 'failed' as const, true],
])('%s: the store syncs and the screens re-read as before', async (_, s, held) => {
  jest.mocked(patchInboxStore).mockResolvedValue(held);
  const { hook } = await mount();
  await push([{ ...ROW, s }]);
  await act(async () => jest.runAllTimersAsync());
  expect(nudgeInboxStore).toHaveBeenCalled();
  expect(changeLists).toHaveBeenCalled();
  await act(async () => hook.unmount());
});
