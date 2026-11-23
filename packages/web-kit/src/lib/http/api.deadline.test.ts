import { READ_TIMEOUT_MS, SEND_TIMEOUT_MS } from '@ab/client-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiFetch, apiSend } from './api';

// docs/43 AU9 / AU10: web reads get mobile's read deadline (client-core), writes 30 s.

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const never = () => new Promise<Response>(() => undefined);
const sentSignal = () => fetchMock.mock.calls.at(-1)?.[1]?.signal;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(never);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it('a read with no answer rejects at 20 s and its fetch is aborted', async () => {
  const read = apiFetch('/threads');
  const settled = expect(read).rejects.toBeInstanceOf(TypeError);
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  await settled;
  expect(sentSignal()?.aborted).toBe(true);
});

it("TanStack's signal reaches the fetch: an abort frees the request at once", async () => {
  const caller = new AbortController();
  const read = apiFetch('/threads', { signal: caller.signal });
  await vi.advanceTimersByTimeAsync(0);
  caller.abort();
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  expect(sentSignal()?.aborted).toBe(true);
});

it('a chat file keeps the slow read deadline', async () => {
  const onDone = vi.fn();
  void apiFetch('/threads/%2B9665/messages/m1/file').then(onDone, onDone);
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 3);
  expect(onDone).not.toHaveBeenCalled();
});

it('a write waits past the read deadline and ends as no answer at 30 s', async () => {
  const onDone = vi.fn();
  const send = apiSend('POST', '/threads/x/text', { text: 'hi' });
  void send.then(onDone, onDone);
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  expect(onDone).not.toHaveBeenCalled();
  const settled = expect(send).rejects.toBeInstanceOf(TypeError);
  await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS - READ_TIMEOUT_MS);
  await settled;
  expect(sentSignal()?.aborted).toBe(true);
});
