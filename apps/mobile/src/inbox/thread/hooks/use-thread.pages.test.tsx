import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { detail, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { threadKey } from './thread-cache';
import { useThread } from './use-thread';

// docs/37 NEW 4: pages go back by (created_at, id), so rows sharing a time are never skipped; a
// cache persisted by an older build (bare `before` strings) still loads after the OTA.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

const AT = '2026-10-02T08:00:00.123456+00:00';
const oldest = message({ id: 'm-old', created_at: AT, body: 'أ' });
const path = `/threads/${encodeURIComponent(PHONE)}`;
const asked = () => mockApiFetch.mock.calls.map(([p]) => String(p));

beforeEach(() => jest.clearAllMocks());

test('the next older page asks before + before_id of the oldest loaded row', async () => {
  mockApiFetch.mockResolvedValue(detail([oldest], { has_more: true }));
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useThread(PHONE), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  await act(() => result.current.fetchNextPage());
  expect(asked()).toContain(`${path}?before=${encodeURIComponent(AT)}&before_id=m-old`);
});

test('a cache persisted by an older build (bare `before` strings) still refetches', async () => {
  mockApiFetch.mockResolvedValue(detail([oldest], { has_more: true }));
  const client = createTestQueryClient();
  const page = detail([oldest], { has_more: true });
  client.setQueryData(threadKey(PHONE), { pages: [page, page], pageParams: [undefined, AT] });
  const { result } = await renderHook(() => useThread(PHONE), { wrapper: queryWrapper(client) });
  await act(() => result.current.refetch());
  expect(asked()).toContain(path);
  expect(asked()).toContain(`${path}?before=${encodeURIComponent(AT)}&before_id=m-old`);
  expect(result.current.isError).toBe(false);
});
