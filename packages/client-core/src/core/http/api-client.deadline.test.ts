import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ApiError, createApiClient, isNoAnswer, SEND_TIMEOUT_MS } from '../../index.js';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const never = () => new Promise<Response>(() => undefined);
const client = (onStall = vi.fn()) =>
  createApiClient({
    baseUrl: () => 'http://api.test',
    accessToken: async () => 'tok',
    clientTag: () => 'web/dev',
    onStall,
  });

const sentSignal = (): AbortSignal | null | undefined => fetchMock.mock.calls.at(-1)?.[1]?.signal;

test('apiSend with no answer rejects as no answer at 30 s and aborts its fetch', async () => {
  fetchMock.mockImplementation(never);
  const onStall = vi.fn();
  const send = client(onStall).apiSend('POST', '/threads/x/text', { text: 'hi' });
  const settled = expect(send).rejects.toEqual(new TypeError('Network request failed'));
  await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS - 1);
  expect(onStall).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await settled;
  expect(onStall).toHaveBeenCalledTimes(1);
  expect(sentSignal()?.aborted).toBe(true);
});

test('an Outbox-waiting write (a join link) keeps waiting past 30 s', async () => {
  fetchMock.mockImplementation(never);
  const onDone = vi.fn();
  void client().apiSend('POST', '/lessons/l1/join-link').then(onDone, onDone);
  await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS * 2);
  expect(onDone).not.toHaveBeenCalled();
});

test('an answer in time resolves; a 4xx is the API refusal, not «no answer»', async () => {
  fetchMock.mockResolvedValueOnce(new Response('{"id":"m1"}', { status: 201 }));
  await expect(client().apiSend('POST', '/x', {})).resolves.toEqual({ id: 'm1' });
  fetchMock.mockResolvedValueOnce(new Response('{"code":"session_closed"}', { status: 409 }));
  const refused = await client().apiSend('POST', '/x', {}).catch((e: unknown) => e);
  expect(refused).toBeInstanceOf(ApiError);
  expect(isNoAnswer(refused)).toBe(false);
});

test('a deadline, a network error, an abort or a 5xx is «no answer»; a 4xx is a refusal', () => {
  const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
  const errors = [new TypeError('Network request failed'), new TypeError('Failed to fetch'), abort];
  expect(errors.map(isNoAnswer)).toEqual([true, true, true]);
  // A 502/504 from the load balancer or a 500 after the outbox commit may have the row.
  const fivexx = [500, 502, 504].map((status) => new ApiError(status, null));
  expect(fivexx.map(isNoAnswer)).toEqual([true, true, true]);
  const fourxx = [400, 403, 409, 499].map((status) => new ApiError(status, null));
  expect(fourxx.map(isNoAnswer)).toEqual([false, false, false, false]);
});
