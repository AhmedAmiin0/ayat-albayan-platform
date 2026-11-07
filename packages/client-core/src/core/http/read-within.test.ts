import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { withReadDeadline } from './read-within.js';
import { READ_TIMEOUT_MS } from './timeouts.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const never = <T>() => new Promise<T>(() => undefined);

test("a GET gets its own signal, and the caller's (TanStack's) abort reaches the transport", async () => {
  const caller = new AbortController();
  let seen: AbortSignal | null | undefined;
  const read = withReadDeadline(
    (init) => {
      seen = init.signal;
      return never<string>();
    },
    { signal: caller.signal },
  );
  caller.abort();
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  expect(seen?.aborted).toBe(true);
});

test('a GET with no answer rejects at the default deadline and tells onTimeout', async () => {
  const onTimeout = vi.fn();
  const read = withReadDeadline(() => never<string>(), {}, { onTimeout });
  const settled = expect(read).rejects.toBeInstanceOf(TypeError);
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  await settled;
  expect(onTimeout).toHaveBeenCalledTimes(1);
});

test('the given deadline wins; without onTimeout (web) it still rejects', async () => {
  const read = withReadDeadline(() => never<string>(), undefined, { timeoutMs: 5 });
  const settled = expect(read).rejects.toBeInstanceOf(TypeError);
  await vi.advanceTimersByTimeAsync(5);
  await settled;
});

test('a write passes straight through with its own init (no read deadline)', async () => {
  const send = vi.fn(async (init: RequestInit) => init.method);
  await expect(withReadDeadline(send, { method: 'POST' })).resolves.toBe('POST');
  expect(send).toHaveBeenCalledWith({ method: 'POST' });
});
