import { INBOX_FALLBACK_MS, INBOX_REFRESH_MS, THREAD_FULL_LIVE_MS, THREAD_FULL_MS } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { detail, inbound, PHONE } from '@/inbox/shared/thread-fixtures';
import { inboxLive } from '@/inbox/thread/live/inbox-live';
import { useThread } from '@/inbox/thread/hooks/use-thread';

// docs/12 §15: while realtime is SUBSCRIBED the open chat's delta runs every INBOX_FALLBACK_MS, a
// safety net for a quietly dead socket or a dropped broadcast (its events re-read it sooner), never
// slower than the offline poll (every 10 s).

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@ab/mobile-kit/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => true }));

const wait = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

async function open() {
  const hook = await renderHook(() => useThread(PHONE), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(hook.result.current.data).toBeDefined());
  mockApiFetch.mockClear();
  return hook;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockApiFetch.mockReset().mockResolvedValue(detail([inbound]));
});
afterEach(async () => {
  await act(async () => inboxLive.setLive(false));
  jest.useRealTimers();
});

test('SUBSCRIBED: the delta runs at the safety net, no slower than the offline poll', async () => {
  await act(async () => inboxLive.setLive(true));
  const hook = await open();
  expect(INBOX_FALLBACK_MS).toBeLessThanOrEqual(INBOX_REFRESH_MS);
  await wait(INBOX_FALLBACK_MS / 2);
  expect(mockApiFetch).not.toHaveBeenCalled();
  await wait(INBOX_FALLBACK_MS / 2);
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  await hook.unmount();
});

test('the channel drops: back to every 10 s', async () => {
  await act(async () => inboxLive.setLive(true));
  const hook = await open();
  await act(async () => inboxLive.setLive(false));
  await wait(INBOX_REFRESH_MS);
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  await wait(INBOX_REFRESH_MS);
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  await hook.unmount();
});

test('SUBSCRIBED: no whole page each minute, only every THREAD_FULL_LIVE_MS (docs/43 AU5)', async () => {
  await act(async () => inboxLive.setLive(true));
  const hook = await open();
  const pages = () => mockApiFetch.mock.calls.filter(([p]) => !String(p).includes('?')).length;
  await wait(THREAD_FULL_MS);
  expect(pages()).toBe(0);
  await wait(THREAD_FULL_LIVE_MS - THREAD_FULL_MS);
  expect(pages()).toBe(1);
  await hook.unmount();
});
