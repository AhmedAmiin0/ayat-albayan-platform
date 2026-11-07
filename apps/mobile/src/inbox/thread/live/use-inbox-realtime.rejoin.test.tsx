import { onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { queryClient as client } from '@/core/lib/query/query-client';
import { nudgeInboxStore } from '@/inbox/thread/local/store-session';
import { inboxLive } from './inbox-live';
import { useInboxRealtime } from './use-inbox-realtime';

jest.mock('./list-marks', () => ({ changeLists: jest.fn() }));
jest.mock('@/inbox/thread/local/store-session', () => ({ nudgeInboxStore: jest.fn() }));

// docs/44 K2: a dropped channel rejoins with backoff, at once on 'active' or the network back,
// and a sync of the phone store follows a successful rejoin.

type Status = (s: string) => void;
const mockJoins: { status?: Status }[] = [];
const mockSupabase = {
  channel: jest.fn(() => {
    const ch: { status?: Status; on: () => typeof ch; subscribe: (cb: Status) => typeof ch } = {
      on: () => ch,
      subscribe: (cb) => ((ch.status = cb), ch),
    };
    mockJoins.push(ch);
    return ch;
  }),
  removeChannel: jest.fn(async () => 'ok'),
  getChannels: jest.fn(() => []),
  realtime: { setAuth: jest.fn(async () => undefined), disconnect: jest.fn(async () => 'ok') },
};
jest.mock('@/core/lib/http/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

const listeners = new Set<(s: AppStateStatus) => void>();
const status = (s: string) => act(async () => mockJoins.at(-1)?.status?.(s));
const later = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockJoins.length = 0;
  listeners.clear();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, cb) => {
    listeners.add(cb);
    return { remove: () => void listeners.delete(cb) };
  });
});
afterEach(() => {
  onlineManager.setOnline(true);
  jest.useRealTimers();
});

test('a drop: not live, a rejoin after 1 s, then 2 s; SUBSCRIBED again syncs the phone store', async () => {
  const hook = await renderHook(() => useInboxRealtime(true));
  await later(0);
  await status('SUBSCRIBED');
  await status('CHANNEL_ERROR');
  expect(inboxLive.isLive()).toBe(false);
  await later(1_000);
  expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
  await status('TIMED_OUT');
  await later(1_999);
  expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
  await later(1);
  expect(mockSupabase.channel).toHaveBeenCalledTimes(3);
  jest.mocked(nudgeInboxStore).mockClear();
  await status('SUBSCRIBED');
  expect(inboxLive.isLive()).toBe(true);
  expect(nudgeInboxStore).toHaveBeenCalled();
  await hook.unmount();
});

test('the network back rejoins a dropped channel at once', async () => {
  const hook = await renderHook(() => useInboxRealtime(true));
  await later(0);
  await status('CLOSED');
  await act(async () => onlineManager.setOnline(false));
  await act(async () => onlineManager.setOnline(true));
  await later(0);
  expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
  await hook.unmount();
  await later(60_000);
  expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
});
