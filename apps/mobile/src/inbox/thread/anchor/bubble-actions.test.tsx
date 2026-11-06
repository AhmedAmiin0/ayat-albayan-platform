import { anchoredThreadKey, anchoredThreadPrefix } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { detail, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { useHideMessage } from '@/inbox/messages/components/hide/use-hide-message';
import { useReact } from '@/inbox/messages/reactions/use-react';
import { useMessageAction } from '@/inbox/thread/hooks/use-thread';

// docs/37 review correction 1: bubble actions inside the window around an old search hit show
// there at once (the window sits outside the live chat's key on purpose).

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const ID = 'b2222222-2222-4222-8222-222222222222';
const old = message({
  id: ID,
  direction: 'inbound',
  created_at: '2026-03-01T08:00:00Z',
  body: 'قديم',
});
const WINDOW = anchoredThreadKey(PHONE, ID);

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(WINDOW, { pages: [detail([old])], pageParams: [{ around: ID }] });
  const spy = jest.spyOn(client, 'invalidateQueries');
  const invalidated = () => spy.mock.calls.map(([f]) => f?.queryKey);
  return { client, invalidated, wrapper: queryWrapper(client) };
}

beforeEach(() => jest.clearAllMocks());

test('useReact: the reaction pill shows in the window at once', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useReact(PHONE, jest.fn()), { wrapper });
  await act(() => result.current.mutate({ message: old, emoji: '👍' }));
  await waitFor(() => {
    const data = client.getQueryData<{ pages: { messages: (typeof old)[] }[] }>(WINDOW);
    expect(data?.pages[0]?.messages[0]?.reactions?.ours).toBe('👍');
  });
});

test('useMessageAction (retry, sent manually, hand-off) refreshes the window', async () => {
  mockApiSend.mockResolvedValue({ ...old, status: 'queued' });
  const { invalidated, wrapper } = setup();
  const { result } = await renderHook(() => useMessageAction(PHONE, 'retry'), { wrapper });
  await act(() => result.current.mutateAsync(ID));
  expect(invalidated()).toContainEqual([...anchoredThreadPrefix(PHONE)]);
});

test('useHideMessage («حذف من المنصة») refreshes the window', async () => {
  mockApiSend.mockResolvedValue(undefined);
  const { invalidated, wrapper } = setup();
  const { result } = await renderHook(() => useHideMessage(PHONE), { wrapper });
  await act(() => result.current.mutateAsync({ id: ID, hide: true }));
  expect(invalidated()).toContainEqual([...anchoredThreadPrefix(PHONE)]);
});
