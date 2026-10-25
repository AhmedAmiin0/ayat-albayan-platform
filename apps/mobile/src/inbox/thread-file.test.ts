import { createTestQueryClient } from '@/test/query';
import { threadFilePath, threadFileQuery } from './thread-file';
import { PHONE } from './thread-fixtures';

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

test('a second tap within the half hour reuses the signed URL', async () => {
  const client = createTestQueryClient();
  await expect(client.fetchQuery(threadFileQuery(PHONE, 'm1'))).resolves.toEqual(FILE);
  await client.fetchQuery(threadFileQuery(PHONE, 'm1'));
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  expect(mockApiFetch).toHaveBeenCalledWith('/threads/%2B966552147730/messages/m1/file');
});
