import { INBOX_REFRESH_MS, THREAD_FULL_MS } from '@ab/client-core';
import type { ThreadDelta } from '@ab/shared';
import { focusManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, delivered, detail, failed, inbound, PHONE } from '../../shared/thread-fixtures';
import { provisionalMessage, sendKey, threadKey, threadMessages, threadPath } from './thread-cache';
import { useThread } from './use-thread';

// An open chat stays live while focused and the app is active (owner 2026-10-27): a delta every
// INBOX_REFRESH_MS (~2 reads), the newest page every THREAD_FULL_MS.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
let mockFocused = true;
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => mockFocused }));

const tick = (ms = INBOX_REFRESH_MS) => act(() => jest.advanceTimersByTimeAsync(ms));
const appActive = (on: boolean) => act(async () => focusManager.setFocused(on));
const PATH = threadPath(PHONE);
const deltas = () => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith(`${PATH}?after=`));
const fulls = () => mockApiFetch.mock.calls.filter((c: unknown[]) => c[0] === PATH).length;

/** GET /threads/:phone answers `page`, ?after= answers `delta`. */
function serve(delta: Partial<ThreadDelta>, page = detail([inbound])) {
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith(`${PATH}?after=`) ? { messages: [], has_more: false, pending: [], ...delta } : page,
  );
}

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
  mockApiFetch.mockReset();
  serve({});
});
afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
});

test('focused: a delta per interval after the newest row, and a new message shows; never the whole page', async () => {
  const { hook } = await open();
  serve({ messages: [delivered] });
  await tick();
  await waitFor(() => expect(threadMessages(hook.result.current.data).map((m) => m.id)).toEqual(['m1', 'm2']));
  expect(new URLSearchParams(deltas()[0]?.split('?')[1]).get('after')).toBe('2026-10-02T08:00:00.000Z');
  expect(fulls()).toBe(1); // the open
});

test('every THREAD_FULL_MS the newest page is read again and folded in', async () => {
  await open();
  await tick(THREAD_FULL_MS);
  expect(fulls()).toBe(2);
  expect(deltas().length).toBeGreaterThanOrEqual(THREAD_FULL_MS / INBOX_REFRESH_MS - 1);
});

test('blurred (another screen on top): no polling', async () => {
  mockFocused = false;
  await open();
  await tick(THREAD_FULL_MS);
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

test('a provisional row still sending survives a delta', async () => {
  const { client, hook } = await open();
  const temp = provisionalMessage({ id: 'tmp', phone: PHONE, body: 'جارٍ' });
  await act(async () => void client.setQueryData(threadKey(PHONE), cachedThread(detail([inbound, temp]))));
  serve({ pending: [{ ...delivered, id: 'other' }] });
  await tick();
  await waitFor(() => expect(deltas().length).toBeGreaterThan(0));
  expect(threadMessages(hook.result.current.data).map((m) => m.id)).toEqual(['m1', 'tmp']);
});

test('a send in flight: the delta leaves the cache to the send', async () => {
  const { client, hook } = await open();
  serve({ messages: [delivered] });
  const isMutating = jest.spyOn(client, 'isMutating').mockImplementation((f) => (f?.mutationKey ? 1 : 0));
  await tick();
  expect(isMutating).toHaveBeenCalledWith({ mutationKey: sendKey(PHONE) });
  expect(threadMessages(hook.result.current.data).map((m) => m.id)).toEqual(['m1']);
});

test('more new rows than one delta: the whole thread is read again, not merged with a gap', async () => {
  const { client } = await open();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  serve({ messages: [delivered, failed], has_more: true });
  await tick();
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: threadKey(PHONE) }));
});
