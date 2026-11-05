import {
  isRead,
  markSending,
  READ_TIMEOUT_MS,
  readTimeoutFor,
  SLOW_READ_TIMEOUT_MS,
  withDeadline,
} from './read-deadline';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const never = <T>() => new Promise<T>(() => undefined);

test('a read that never settles rejects as no answer at the deadline, stage token', async () => {
  const onTimeout = jest.fn();
  const read = withDeadline(() => never<string>(), { onTimeout });
  const settled = expect(read).rejects.toEqual(new TypeError('Network request failed'));
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS - 1);
  expect(onTimeout).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  await settled;
  expect(onTimeout).toHaveBeenCalledTimes(1);
  expect(onTimeout).toHaveBeenCalledWith('token');
});

test('once the transport sent it, a stall is the fetch stage, and its signal is aborted', async () => {
  const onTimeout = jest.fn();
  let seen: AbortSignal | undefined;
  const read = withDeadline(
    (signal) => {
      seen = signal;
      markSending(signal);
      return never<string>();
    },
    { onTimeout },
  );
  const settled = expect(read).rejects.toBeInstanceOf(TypeError);
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  await settled;
  expect(onTimeout).toHaveBeenCalledWith('fetch');
  expect(seen?.aborted).toBe(true);
});

test('an answer in time resolves and clears the timer (no late timeout)', async () => {
  const onTimeout = jest.fn();
  await expect(withDeadline(async () => 'ok', { onTimeout })).resolves.toBe('ok');
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 2);
  expect(onTimeout).not.toHaveBeenCalled();
});

test("the caller's abort ends it at once as an AbortError, never a stall", async () => {
  const onTimeout = jest.fn();
  const caller = new AbortController();
  let inner: AbortSignal | undefined;
  const read = withDeadline(
    (signal) => {
      inner = signal;
      return never<string>();
    },
    { onTimeout, signal: caller.signal },
  );
  caller.abort();
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  expect(inner?.aborted).toBe(true);
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  expect(onTimeout).not.toHaveBeenCalled();
});

test('a caller signal that is already aborted ends it at once', async () => {
  const caller = new AbortController();
  caller.abort();
  const read = withDeadline(() => never<string>(), { onTimeout: jest.fn(), signal: caller.signal });
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
});

test('only GET and HEAD are reads', () => {
  expect([undefined, 'get', 'HEAD'].map((method) => isRead(method ? { method } : {}))).toEqual([
    true,
    true,
    true,
  ]);
  expect(['POST', 'PATCH', 'PUT', 'DELETE'].map((method) => isRead({ method }))).toEqual([
    false,
    false,
    false,
    false,
  ]);
});

test('chat files, PDF pages and booking media: the slow deadline; other reads: normal', () => {
  const chat = '/threads/%2B9665/messages/m1';
  const media = '/threads/%2B9665/media/m1';
  expect(
    [`${chat}/file`, `${chat}/file?download=1`, `${chat}/pdf/2`, media].map(readTimeoutFor),
  ).toEqual(Array<number>(4).fill(SLOW_READ_TIMEOUT_MS));
  const normal = ['/threads?page=1', '/threads/%2B9665', `${chat}/files`, `${media}/x`];
  expect(normal.map(readTimeoutFor)).toEqual(Array<number>(4).fill(READ_TIMEOUT_MS));
});
