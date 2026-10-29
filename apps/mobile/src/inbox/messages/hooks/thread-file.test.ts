import { ApiError } from '@/core/lib/http/api';
import { createTestQueryClient } from '@/test/query';
import { pdfPagePath, pdfPageQuery, signedStaleTime, threadFilePath, threadFileQuery } from './thread-file';
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

/** A refetch or retry option, as TanStack resolves it (for one query, or a failure count and error). */
const resolve = (option: unknown, ...args: unknown[]): unknown => (typeof option === 'function' ? Reflect.apply(option, undefined, args) : option);

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

// A chat PDF's pages (owner 2026-10-29).
test('a PDF page: its own key and path, off the disk cache, an hour of cache', () => {
  const q = pdfPageQuery(PHONE, 'm1', 3);
  expect(q.queryKey).toEqual(['thread-pdf', PHONE, 'm1', 3]);
  expect(pdfPagePath(PHONE, 'm1', 3)).toBe('/threads/%2B966552147730/messages/m1/pdf/3');
  expect(q.meta).toEqual({ noPersist: true });
  expect(q.gcTime).toBe(60 * 60_000);
});

test('a PDF page: a 503 is retried 3 times; a 4xx, a 500 or no answer never', () => {
  const { retry } = pdfPageQuery(PHONE, 'm1', 1);
  const busy = new ApiError(503, { code: 'pdf_busy' });
  expect([0, 1, 2, 3].map((n) => resolve(retry, n, busy))).toEqual([true, true, true, false]);
  for (const e of [new ApiError(422, { code: 'pdf_no_preview' }), new ApiError(410), new ApiError(500), new Error('offline')]) {
    expect(resolve(retry, 0, e)).toBe(false);
  }
});

test('a PDF page: a 503 is asked again when the bubble mounts again; a 4xx stays', async () => {
  const client = createTestQueryClient();
  const q = pdfPageQuery(PHONE, 'm1', 1);
  const onMount = async (e: Error) => {
    mockApiFetch.mockRejectedValue(e);
    await client.fetchQuery({ ...q, retry: false }).catch(() => undefined);
    const query = client.getQueryCache().find({ queryKey: q.queryKey });
    if (!query) throw new Error('no query');
    return resolve(q.retryOnMount, query);
  };
  expect(await onMount(new ApiError(503, { code: 'pdf_render_failed' }))).toBe(true);
  expect(await onMount(new ApiError(422, { code: 'pdf_no_preview' }))).toBe(false);
  expect(await onMount(new ApiError(410, { code: 'media_expired' }))).toBe(false);
});
