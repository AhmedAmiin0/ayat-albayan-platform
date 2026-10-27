import { INBOX_FALLBACK_MS, INBOX_REFRESH_MS } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { detail, inbound, PHONE } from '../../shared/thread-fixtures';
import { inboxLive } from '../live/inbox-live';
import { useThread } from './use-thread';

// docs/12 §15: while realtime is SUBSCRIBED the open chat re-reads only every INBOX_FALLBACK_MS (its
// events re-read it sooner); not connected (error, timeout, closed, never) it polls every 10 s as before.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => true }));

const wait = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

async function open() {
  const hook = await renderHook(() => useThread(PHONE), { wrapper: queryWrapper(createTestQueryClient()) });
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

test('SUBSCRIBED: one read per 60 s, none at 10 s', async () => {
  await act(async () => inboxLive.setLive(true));
  const hook = await open();
  await wait(INBOX_REFRESH_MS * 3);
  expect(mockApiFetch).not.toHaveBeenCalled();
  await wait(INBOX_FALLBACK_MS - INBOX_REFRESH_MS * 3);
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
