import { SYNC_LIMIT_DEFAULT } from '@ab/shared';
import { fetchSyncPage } from './sync-fetch';
import { answer, row } from './store-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (path: string, init: RequestInit) => mockApiFetch(path, init),
}));

const signal = new AbortController().signal;
const CURSOR = '2026-11-06T10:00:00.000001+00:00~c0000000-0000-4000-8000-000000000001';

beforeEach(() => mockApiFetch.mockReset());

test('a first sync: no since, the default limit; the answer parsed', async () => {
  mockApiFetch.mockResolvedValue(answer({ messages: [row({ n: 1 })] }));
  const out = await fetchSyncPage(undefined, signal);
  expect(mockApiFetch).toHaveBeenCalledWith(`/threads/sync?limit=${SYNC_LIMIT_DEFAULT}`, { signal });
  expect(out.messages).toEqual([row({ n: 1 })]);
});

test('a later sync passes the cursor, encoded', async () => {
  mockApiFetch.mockResolvedValue(answer());
  await fetchSyncPage(CURSOR, signal);
  const since = encodeURIComponent(CURSOR);
  const path = `/threads/sync?since=${since}&limit=${SYNC_LIMIT_DEFAULT}`;
  expect(mockApiFetch).toHaveBeenCalledWith(path, { signal });
  expect(since).toContain('%2B00%3A00'); // the «+» of the offset survives
});

test('a malformed answer throws (the engine keeps its mark and retries)', async () => {
  mockApiFetch.mockResolvedValue({ messages: 'x' });
  await expect(fetchSyncPage(undefined, signal)).rejects.toThrow();
});
