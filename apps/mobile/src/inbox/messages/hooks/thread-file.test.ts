import { createTestQueryClient } from '@/test/query';
import { signedStaleTime, threadFilePath, threadFileQuery } from './thread-file';
import { PHONE } from '../../shared/thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const FILE = { url: 'https://s.test/f', mime: 'audio/ogg', expires_at: '2026-10-19T10:00:00Z' };

beforeEach(() => mockApiFetch.mockReset().mockResolvedValue(FILE));

test('the W6 path, the phone encoded', () => {
  expect(threadFilePath(PHONE, 'm1')).toBe('/threads/%2B966552147730/messages/m1/file');
});

test('kept off the disk cache, outside ["threads"], never retried', () => {
  const q = threadFileQuery(PHONE, 'm1');
  expect(q.meta).toEqual({ noPersist: true });
  expect(q.queryKey[0]).toBe('thread-file');
  expect(q.retry).toBe(false);
});

test('a second tap within the signed hour reuses the signed URL', async () => {
  const fresh = { ...FILE, expires_at: new Date(Date.now() + 60 * 60_000).toISOString() };
  mockApiFetch.mockResolvedValue(fresh);
  const client = createTestQueryClient();
  await expect(client.fetchQuery(threadFileQuery(PHONE, 'm1'))).resolves.toEqual(fresh);
  await client.fetchQuery(threadFileQuery(PHONE, 'm1'));
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  expect(mockApiFetch).toHaveBeenCalledWith('/threads/%2B966552147730/messages/m1/file');
});

test('a signed URL stays fresh until 5 minutes before it expires', () => {
  const now = Date.parse('2026-10-19T09:00:00Z');
  expect(signedStaleTime(FILE, now)).toBe(55 * 60_000);
  expect(signedStaleTime({ ...FILE, expires_at: '2026-10-19T09:03:00Z' }, now)).toBe(0);
  expect(signedStaleTime({ ...FILE, expires_at: '' }, now)).toBe(0);
  expect(signedStaleTime(undefined, now)).toBe(0);
});

test('a thumbnail remount never asks again after a 410: no retry on mount, an hour of cache', () => {
  const q = threadFileQuery(PHONE, 'm1');
  expect(q.retryOnMount).toBe(false);
  expect(q.gcTime).toBe(60 * 60_000);
});

/** A refetch option, as TanStack resolves it for one query. */
const resolve = (option: unknown, query: unknown): unknown => (typeof option === 'function' ? Reflect.apply(option, undefined, [query]) : option);

test('a failure is not asked again on mount, focus or reconnect; a success follows the defaults', async () => {
  mockApiFetch.mockRejectedValue(new Error('410'));
  const client = createTestQueryClient();
  const q = threadFileQuery(PHONE, 'm1');
  await client.fetchQuery(q).catch(() => undefined);
  const query = client.getQueryCache().find({ queryKey: q.queryKey });
  if (!query) throw new Error('no query');
  for (const option of [q.refetchOnMount, q.refetchOnWindowFocus, q.refetchOnReconnect]) {
    expect(resolve(option, query)).toBe(false);
  }
  mockApiFetch.mockResolvedValue(FILE);
  await client.fetchQuery({ ...q, staleTime: 0 });
  expect(resolve(q.refetchOnWindowFocus, query)).toBe(true);
});
