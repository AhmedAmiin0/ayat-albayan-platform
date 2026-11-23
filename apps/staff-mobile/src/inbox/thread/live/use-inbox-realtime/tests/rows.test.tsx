import { chatLiveKey, type LiveRow } from '@ab/client-core';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { queryClient as client } from '@ab/mobile-kit';
import { nudgeInboxStore, patchInboxStore } from '@/inbox/thread/local/store-session';
import { inboxLive } from '@/inbox/thread/live/inbox-live';
import { changeLists } from '@/inbox/thread/live/list-marks';
import { useInboxRealtime } from '@/inbox/thread/live/use-inbox-realtime/use-inbox-realtime';

jest.mock('@/inbox/thread/live/list-marks', () => ({ changeLists: jest.fn() }));
jest.mock('@/inbox/thread/local/store-session/store-session', () => ({
  nudgeInboxStore: jest.fn(),
  patchInboxStore: jest.fn(),
}));

// docs/44 K1 on mobile: an event's ticks go into the phone store (a visual patch); it re-reads all
// the same.

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
jest.mock('@ab/mobile-kit/lib/http/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

async function mount() {
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const hook = await renderHook(() => useInboxRealtime(true));
  await act(async () => undefined);
  await act(async () => mockHooks.status?.('SUBSCRIBED'));
  inboxLive.watch(chatLiveKey(OPEN));
  inboxLive.watch('list');
  jest.clearAllMocks();
  return { hook };
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

test('rows patch the phone store first, then the sync and the screens re-read as before', async () => {
  const { hook } = await mount();
  const order: string[] = [];
  jest.mocked(patchInboxStore).mockImplementation(async () => void order.push('patch'));
  jest.mocked(nudgeInboxStore).mockImplementation(() => void order.push('nudge'));
  await push([ROW]);
  await act(async () => jest.runAllTimersAsync());
  expect(patchInboxStore).toHaveBeenCalledWith(OPEN, [ROW]);
  expect(order[0]).toBe('patch');
  expect(order).toContain('nudge');
  expect(changeLists).toHaveBeenCalled();
  await act(async () => hook.unmount());
});

test('a failed patch never stops the re-read', async () => {
  jest.mocked(patchInboxStore).mockRejectedValue(new Error('disk'));
  const { hook } = await mount();
  await push([{ ...ROW, s: 'queued' }]);
  await act(async () => jest.runAllTimersAsync());
  expect(nudgeInboxStore).toHaveBeenCalled();
  expect(changeLists).toHaveBeenCalled();
  await act(async () => hook.unmount());
});
