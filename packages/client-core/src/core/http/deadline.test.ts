import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { markSending, withDeadline } from './deadline.js';
import { READ_TIMEOUT_MS } from './timeouts.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const never = <T>() => new Promise<T>(() => undefined);
const timeoutMs = READ_TIMEOUT_MS;

test('a request that never settles rejects as no answer at the deadline, stage token', async () => {
  const onTimeout = vi.fn();
  const read = withDeadline(() => never<string>(), { onTimeout, timeoutMs });
  const settled = expect(read).rejects.toEqual(new TypeError('Network request failed'));
  await vi.advanceTimersByTimeAsync(timeoutMs - 1);
  expect(onTimeout).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await settled;
  expect(onTimeout).toHaveBeenCalledTimes(1);
  expect(onTimeout).toHaveBeenCalledWith('token');
});

test('once the transport sent it, a stall is the fetch stage, and its signal is aborted', async () => {
  const onTimeout = vi.fn();
  let seen: AbortSignal | undefined;
  const run = (signal: AbortSignal) => {
    seen = signal;
    markSending(signal);
    return never<string>();
  };
  const read = withDeadline(run, { onTimeout, timeoutMs });
  const settled = expect(read).rejects.toBeInstanceOf(TypeError);
  await vi.advanceTimersByTimeAsync(timeoutMs);
  await settled;
  expect(onTimeout).toHaveBeenCalledWith('fetch');
  expect(seen?.aborted).toBe(true);
});

test('an answer in time resolves and clears the timer (no late timeout)', async () => {
  const onTimeout = vi.fn();
  await expect(withDeadline(async () => 'ok', { onTimeout, timeoutMs })).resolves.toBe('ok');
  await vi.advanceTimersByTimeAsync(timeoutMs * 2);
  expect(onTimeout).not.toHaveBeenCalled();
});

test("the caller's abort ends it at once as an AbortError, never a stall", async () => {
  const onTimeout = vi.fn();
  const caller = new AbortController();
  let inner: AbortSignal | undefined;
  const run = (signal: AbortSignal) => {
    inner = signal;
    return never<string>();
  };
  const read = withDeadline(run, { onTimeout, signal: caller.signal, timeoutMs });
  caller.abort();
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  expect(inner?.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(timeoutMs);
  expect(onTimeout).not.toHaveBeenCalled();
});

test('a caller signal that is already aborted ends it at once', async () => {
  const caller = new AbortController();
  caller.abort();
  const opts = { onTimeout: vi.fn(), signal: caller.signal, timeoutMs };
  await expect(withDeadline(() => never<string>(), opts)).rejects.toMatchObject({
    name: 'AbortError',
  });
});

test('a refusal passes through unchanged', async () => {
  const error = new Error('boom');
  const opts = { onTimeout: vi.fn(), timeoutMs };
  await expect(withDeadline(() => Promise.reject(error), opts)).rejects.toBe(error);
});
