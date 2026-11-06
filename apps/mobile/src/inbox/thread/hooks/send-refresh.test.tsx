import { useInfiniteQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, detail, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { threadKey, threadMessages, threadPath, type ThreadCache } from './thread-cache';
import { threadQuery, useSendMessage } from './use-thread';

// docs/44 BUG3 / docs/43 AU4: a send reads the chat's newest page once, however far up she
// scrolled; the older pages are not re-read one by one.

const mockApiSend = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

const at = (minute: number) => `2026-10-02T08:${String(minute).padStart(2, '0')}:00Z`;
const row = (id: string, minute: number) => message({ id, created_at: at(minute) });
/** Five loaded pages, newest first. */
const fivePages = () =>
  cachedThread(
    detail([row('m40', 40)], { has_more: true }),
    detail([row('m30', 30)], { has_more: true }),
    detail([row('m20', 20)], { has_more: true }),
    detail([row('m10', 10)], { has_more: true }),
    detail([row('m01', 1)]),
  );

/** The open chat (an observer that never refetches by itself) and its composer's send. */
function useOpenSend() {
  useInfiniteQuery({ ...threadQuery(PHONE), staleTime: Infinity });
  return useSendMessage(PHONE);
}

beforeEach(() => jest.clearAllMocks());

test('with five pages loaded a send reads only the newest page, then folds it in', async () => {
  const server = message({ id: 's1', body: 'وصلت', status: 'sent', created_at: at(50) });
  mockApiSend.mockResolvedValue(server);
  mockApiFetch.mockResolvedValue(detail([row('m40', 40), { ...server, status: 'delivered' }]));
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), fivePages());
  const spy = jest.spyOn(client, 'invalidateQueries');
  const { result } = await renderHook(useOpenSend, { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate({ id: 'p1', out: { kind: 'text', text: 'وصلت' } }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockApiFetch.mock.calls.map(([path]) => String(path))).toEqual([threadPath(PHONE)]);
  expect(spy).not.toHaveBeenCalledWith({ queryKey: threadKey(PHONE) });
  const data = client.getQueryData<ThreadCache>(threadKey(PHONE));
  expect(data?.pages).toHaveLength(5);
  const shown = threadMessages(data);
  expect(shown.map((m) => m.id)).toEqual(['m01', 'm10', 'm20', 'm30', 'm40', 's1']);
  expect(shown.at(-1)?.status).toBe('delivered');
});

test('the provisional row shows at once and leaves no double when the server row arrives', async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const server = message({ id: 's1', body: 'وصلت', status: 'sent', created_at: at(50) });
  mockApiFetch.mockResolvedValue(detail([row('m40', 40), server]));
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), fivePages());
  const { result } = await renderHook(useOpenSend, { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate({ id: 'p1', out: { kind: 'text', text: 'وصلت' } }));
  const cached = () => client.getQueryData<ThreadCache>(threadKey(PHONE));
  const ids = () => threadMessages(cached()).map((m) => m.id);
  await waitFor(() => expect(ids().at(-1)).toBe('p1'));
  await act(async () => answer(server));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(ids().filter((id) => id === 's1' || id === 'p1')).toEqual(['s1']);
});
