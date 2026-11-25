import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { probe, PROBE_TIMEOUT_MS } from './probe';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const reply = (body: string, status = 200): typeof fetch =>
  vi.fn(() => Promise.resolve(new Response(body, { status })));

test('a JSON reply comes back as status and parsed body', async () => {
  const answer = await probe('https://api.test/settings/public', { fetch: reply('{"a":1}') });
  expect(answer).toEqual({ status: 200, body: { a: 1 } });
});

test('a 503 is an answer too (the caller classes it)', async () => {
  expect(await probe('u', { fetch: reply('down', 503) })).toEqual({ status: 503, body: 'down' });
});

test('one bare GET: no-store, no headers, the caller\'s mode', async () => {
  const send = reply('');
  await probe('u', { fetch: send, mode: 'no-cors' });
  const init = vi.mocked(send).mock.calls[0]?.[1];
  expect(init).toMatchObject({ method: 'GET', cache: 'no-store', mode: 'no-cors' });
  expect(init).not.toHaveProperty('headers');
});

test('an opaque no-cors reply is status 0 with a null body', async () => {
  const opaque = { type: 'opaque', status: 0, text: vi.fn() } as unknown as Response;
  const answer = await probe('u', { fetch: () => Promise.resolve(opaque), mode: 'no-cors' });
  expect(answer).toEqual({ status: 0, body: null });
  expect(opaque.text).not.toHaveBeenCalled();
});

test('a dropped connection resolves null, never throws', async () => {
  const fail: typeof fetch = () => Promise.reject(new TypeError('Network request failed'));
  expect(await probe('u', { fetch: fail })).toBeNull();
});

test('no answer within the deadline aborts and resolves null', async () => {
  let signal: AbortSignal | null | undefined;
  const hang: typeof fetch = (_url, init) => {
    signal = init?.signal;
    return new Promise((_ok, no) => signal?.addEventListener('abort', () => no(new Error('aborted'))));
  };
  const answer = probe('u', { fetch: hang });
  await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS - 1);
  expect(signal?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await answer).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

test('a settled probe clears its timer', async () => {
  await probe('u', { fetch: reply('{}'), timeoutMs: 50 });
  expect(vi.getTimerCount()).toBe(0);
});
