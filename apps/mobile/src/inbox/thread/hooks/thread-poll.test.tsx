import { INBOX_REFRESH_MS } from '@ab/client-core';
import { focusManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, delivered, detail, inbound, PHONE } from '../../shared/thread-fixtures';
import { provisionalMessage, threadKey, threadMessages, threadPath } from './thread-cache';
import { useThread } from './use-thread';

// An open chat polls its newest page while focused and the app is active (owner 2026-10-27).

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
let mockFocused = true;
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => mockFocused }));

const tick = () => act(() => jest.advanceTimersByTimeAsync(INBOX_REFRESH_MS));
const appActive = (on: boolean) => act(async () => focusManager.setFocused(on));

async function open() {
  const client = createTestQueryClient();
  const hook = await renderHook(() => useThread(PHONE), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(hook.result.current.data).toBeDefined());
  return { client, hook };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockFocused = true;
  focusManager.setFocused(true);
  mockApiFetch.mockReset().mockResolvedValue(detail([inbound]));
});
afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
});

test('focused: one read per interval, only the newest page, and a new message shows', async () => {
  const { hook } = await open();
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  mockApiFetch.mockResolvedValue(detail([inbound, delivered]));
  await tick();
  await waitFor(() => expect(threadMessages(hook.result.current.data).map((m) => m.id)).toEqual(['m1', 'm2']));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  expect(mockApiFetch).toHaveBeenLastCalledWith(threadPath(PHONE));
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(3);
});

test('blurred (another screen on top): no polling', async () => {
  mockFocused = false;
  await open();
  await tick();
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
});

test('the app in the background: no polling until it is active again', async () => {
  await open();
  await appActive(false);
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  await appActive(true);
  await tick();
  expect(mockApiFetch.mock.calls.length).toBeGreaterThan(1);
});

test('a provisional row still sending survives a poll', async () => {
  const { client, hook } = await open();
  const temp = provisionalMessage({ id: 'tmp', phone: PHONE, body: 'جارٍ' });
  await act(async () => void client.setQueryData(threadKey(PHONE), cachedThread(detail([inbound, temp]))));
  mockApiFetch.mockResolvedValue(detail([inbound, delivered]));
  await tick();
  await waitFor(() => expect(threadMessages(hook.result.current.data).map((m) => m.id)).toEqual(['m1', 'm2', 'tmp']));
});
