import { probeApi } from './probe';

const url = 'http://api.test/health';

test('any HTTP answer is reachable, even a 503', async () => {
  const get = jest.fn(async () => new Response('', { status: 503 }));
  await expect(probeApi({ url, fetch: get })).resolves.toBe(true);
  expect(get).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'GET' }));
});

test('no answer is a failure', async () => {
  const get = jest.fn(async () => Promise.reject(new TypeError('Network request failed')));
  await expect(probeApi({ url, fetch: get })).resolves.toBe(false);
});

test('a hanging request fails at the timeout (it is aborted)', async () => {
  jest.useFakeTimers();
  const get = jest.fn(
    (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
  );
  const result = probeApi({ url, fetch: get, timeoutMs: 100 });
  await jest.advanceTimersByTimeAsync(100);
  await expect(result).resolves.toBe(false);
  jest.useRealTimers();
});
