import { MutationObserver, QueryObserver, type QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query';

let client: QueryClient | undefined;
afterEach(() => client?.clear());

const watch = (made: QueryClient, queryKey: string[]) => {
  const queryFn = vi.fn(() => Promise.resolve('row'));
  const observer = new QueryObserver(made, { queryKey, queryFn });
  const off = observer.subscribe(() => undefined);
  return { queryFn, off };
};

const write = (made: QueryClient, mutationKey?: string[]) =>
  new MutationObserver(made, { mutationKey, mutationFn: () => Promise.resolve('ok') }).mutate();

const isStale = (made: QueryClient, queryKey: string[]) =>
  made.getQueryCache().find({ queryKey, exact: true })?.isStale() ?? false;

describe('a successful write marks cached reads stale', () => {
  it('a cached read goes stale and an open screen is not read again', async () => {
    const made = createQueryClient();
    client = made;
    const open = watch(made, ['students', 's1']);
    await vi.waitFor(() => expect(made.getQueryData(['students', 's1'])).toBe('row'));
    expect(isStale(made, ['students', 's1'])).toBe(false);
    await write(made);
    expect(isStale(made, ['students', 's1'])).toBe(true);
    expect(open.queryFn).toHaveBeenCalledTimes(1);
    open.off();
  });

  it('a failed write leaves the reads fresh', async () => {
    const made = createQueryClient();
    client = made;
    made.setQueryData(['money'], 'm');
    const failing = new MutationObserver(made, { mutationFn: () => Promise.reject(new Error('x')) });
    await failing.mutate().catch(() => undefined);
    expect(isStale(made, ['money'])).toBe(false);
  });

  it('a send in the open chat reads the thread no second time', async () => {
    const made = createQueryClient();
    client = made;
    const thread = ['threads', 'detail', '+201000000000'];
    const open = watch(made, thread);
    await vi.waitFor(() => expect(made.getQueryData(thread)).toBe('row'));
    await write(made, ['inbox-send', '+201000000000']);
    await Promise.resolve();
    expect(open.queryFn).toHaveBeenCalledTimes(1);
    expect(made.getQueryState(thread)?.isInvalidated).toBe(false);
    open.off();
  });
});
