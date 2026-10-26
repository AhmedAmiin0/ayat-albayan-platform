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

test('a signed URL stays fresh until 5 minutes before it expires; an error stays an hour less the margin', () => {
  const now = Date.parse('2026-10-19T09:00:00Z');
  expect(signedStaleTime(FILE, now)).toBe(55 * 60_000);
  expect(signedStaleTime({ ...FILE, expires_at: '2026-10-19T09:03:00Z' }, now)).toBe(0);
  expect(signedStaleTime({ ...FILE, expires_at: '' }, now)).toBe(0);
  expect(signedStaleTime(undefined, now)).toBe(55 * 60_000);
});

test('a thumbnail remount never asks again after a 410: no retry on mount, an hour of cache', () => {
  const q = threadFileQuery(PHONE, 'm1');
  expect(q.retryOnMount).toBe(false);
  expect(q.gcTime).toBe(60 * 60_000);
});
