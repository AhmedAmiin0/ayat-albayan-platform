import { ApiError, shouldRetryUnanswered } from '@ab/client-core';
import { QueryObserver, type QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient, STALE_MS } from '@/lib/query';
import { pathKey } from '@ab/client-core';

let client: QueryClient | undefined;
afterEach(() => client?.clear());

const failingRead = (error: Error) => {
  const made = createQueryClient();
  client = made;
  const queryFn = vi.fn((): Promise<string> => Promise.reject(error));
  const observer = new QueryObserver(made, { queryKey: pathKey('/x'), queryFn, retryDelay: 0 });
  return { queryFn, observer };
};

const settled = (observer: QueryObserver<string, Error, string, string, string[]>) =>
  new Promise<void>((resolve) => {
    const off = observer.subscribe((r) => {
      if (r.status !== 'error') return;
      off();
      resolve();
    });
  });

describe('staff-web query defaults', () => {
  it('reads stay fresh for 30 s and retry with the shared web rule', () => {
    const { queries } = createQueryClient().getDefaultOptions();
    expect(STALE_MS).toBe(30_000);
    expect(queries?.staleTime).toBe(STALE_MS);
    expect(queries?.retry).toBe(shouldRetryUnanswered);
  });

  it('a 404 is read once', async () => {
    const { queryFn, observer } = failingRead(new ApiError(404));
    await settled(observer);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('a 500 is retried', async () => {
    const { queryFn, observer } = failingRead(new ApiError(500));
    await settled(observer);
    expect(queryFn).toHaveBeenCalledTimes(4);
  });

  it('a read with no answer is retried: the web has no reconnect signal to refetch it', async () => {
    const { queryFn, observer } = failingRead(new TypeError('Failed to fetch'));
    await settled(observer);
    expect(queryFn).toHaveBeenCalledTimes(4);
  });

  it.each([
    [['threads', 'detail', '+201000000000']],
    [['calls', 'active']],
    [['chat-lists']],
  ])('the inbox and calls key %j keeps staleTime 0', (queryKey) => {
    expect(createQueryClient().getQueryDefaults(queryKey).staleTime).toBe(0);
  });
});
