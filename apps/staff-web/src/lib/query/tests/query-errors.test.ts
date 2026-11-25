import { ApiError } from '@ab/client-core';
import { QueryObserver, type QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient, queryErrorHandler } from '@/lib/query';
import { pathKey } from '@ab/client-core';

const report = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/boot/web-errors', () => ({ reportWebError: report }));

let client: QueryClient | undefined;
afterEach(() => {
  client?.clear();
  report.mockClear();
});

function failingReads(error: Error, count: number) {
  const leave = vi.fn(() => new Promise<void>(() => undefined));
  const made = createQueryClient(queryErrorHandler(leave));
  client = made;
  const reads = Array.from({ length: count }, (_, i) => {
    const queryFn = (): Promise<string> => Promise.reject(error);
    const observer = new QueryObserver(made, { queryKey: pathKey(`/x/${i}`), queryFn, retry: false });
    return new Promise<void>((done) => observer.subscribe((r) => r.isError && done()));
  });
  return { leave, settled: Promise.all(reads) };
}

describe('staff-web query errors', () => {
  it('a 401 on every read of the screen signs out once', async () => {
    const { leave, settled } = failingReads(new ApiError(401), 3);
    await settled;
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('a disabled account signs out; a plain 403 keeps the session', async () => {
    const plain = failingReads(new ApiError(403), 1);
    await plain.settled;
    expect(plain.leave).not.toHaveBeenCalled();
    const disabled = failingReads(new ApiError(403, { code: 'account_disabled' }), 1);
    await disabled.settled;
    expect(disabled.leave).toHaveBeenCalledTimes(1);
  });

  it('a 5xx or a lost answer is reported; a 4xx is an answer, not reported', async () => {
    await failingReads(new ApiError(404), 1).settled;
    expect(report).not.toHaveBeenCalled();
    await failingReads(new ApiError(500), 1).settled;
    await failingReads(new TypeError('Failed to fetch'), 1).settled;
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('a failed write signs out and reports the same way', async () => {
    const leave = vi.fn(async () => undefined);
    const made = createQueryClient(queryErrorHandler(leave));
    client = made;
    const write = made.getMutationCache().build(made, {
      mutationFn: () => Promise.reject(new ApiError(401)),
    });
    await expect(write.execute(undefined)).rejects.toBeInstanceOf(ApiError);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('without a handler the client still builds (tests, tools)', () => {
    expect(createQueryClient().getQueryCache()).toBeTruthy();
  });
});
