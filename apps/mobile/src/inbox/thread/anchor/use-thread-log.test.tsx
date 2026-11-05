import { ApiError } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { detail, message, PHONE } from '@/inbox/shared/thread-fixtures';
import { threadKey } from '@/inbox/thread/hooks/thread-cache';
import { useThread } from '@/inbox/thread/hooks/use-thread';
import { markOwnSend } from './own-send';
import { useThreadLog } from './use-thread-log';

// docs/37 NEW 3: `?msg=` opens the chat at a search hit: a loaded one scrolls, any other opens
// the window around it with one request; decided once per msg; a send or a gone hit leaves it.

const mockParams = jest.fn((): { msg?: string } => ({}));
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
  router: { setParams: (p: unknown) => mockSetParams(p) },
}));
const mockSay = jest.fn();
jest.mock('@/inbox/thread/hooks/chat-actions', () => ({
  useChatActions: () => ({ say: mockSay }),
}));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

const SHOWN = 'a1111111-1111-4111-8111-111111111111';
const OLD = 'b2222222-2222-4222-8222-222222222222';
const shown = message({ id: SHOWN, created_at: '2026-10-02T08:00:00Z', body: 'درس اليوم' });
const old = message({ id: OLD, created_at: '2026-03-01T08:00:00Z', body: 'درس قديم' });
const newer = message({ id: 'c3', created_at: '2026-03-01T09:00:00Z', body: 'بعده' });

function answer(path: string): Promise<unknown> {
  const around = path.includes('?around=');
  return Promise.resolve(around ? detail([old, newer], { has_more: true }) : detail([shown]));
}

async function render() {
  const client = createTestQueryClient();
  const hook = await renderHook(() => useThreadLog(PHONE, useThread(PHONE)), {
    wrapper: queryWrapper(client),
  });
  return { ...hook, client };
}

const aroundCalls = () => mockApiFetch.mock.calls.filter(([p]) => String(p).includes('?around='));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer);
});

test('a hit already loaded scrolls on the live chat: no window, no extra request', async () => {
  mockParams.mockReturnValue({ msg: SHOWN });
  const { result } = await render();
  await waitFor(() => expect(result.current.target).toEqual({ id: SHOWN, ready: true }));
  expect(result.current.anchored).toBe(false);
  expect(result.current.to).toBeNull();
  expect(aroundCalls()).toHaveLength(0);
});

test('a hit not loaded opens the window around it with one request', async () => {
  mockParams.mockReturnValue({ msg: OLD });
  const { result } = await render();
  await waitFor(() => expect(result.current.target).toEqual({ id: OLD, ready: true }));
  expect(result.current.anchored).toBe(true);
  expect(aroundCalls()).toEqual([
    [`/threads/${encodeURIComponent(PHONE)}?around=${OLD}`, undefined],
  ]);
  expect(result.current.query.data?.pages[0]?.messages.map((m) => m.id)).toEqual([OLD, 'c3']);
  expect(result.current.to).toBe(newer.created_at);
});

test('decided once: the live chat later holding the hit never flips the window', async () => {
  mockParams.mockReturnValue({ msg: OLD });
  const { result, client } = await render();
  await waitFor(() => expect(result.current.anchored).toBe(true));
  await act(() =>
    client.setQueryData(threadKey(PHONE), { pages: [detail([old, shown])], pageParams: [null] }),
  );
  expect(result.current.anchored).toBe(true);
});

test('no msg, or not a uuid: the live chat', async () => {
  mockParams.mockReturnValue({ msg: 'x' });
  const { result } = await render();
  await waitFor(() => expect(result.current.query.data).toBeDefined());
  expect([result.current.anchored, result.current.target]).toEqual([false, null]);
});

test('a send from this device leaves the window', async () => {
  mockParams.mockReturnValue({ msg: OLD });
  const { result } = await render();
  await waitFor(() => expect(result.current.anchored).toBe(true));
  await act(() => markOwnSend(PHONE));
  expect(mockSetParams).toHaveBeenCalledWith({ msg: undefined });
});

test('a gone hit (404) says so and goes back to the live chat', async () => {
  mockParams.mockReturnValue({ msg: OLD });
  mockApiFetch.mockImplementation((path: string) =>
    path.includes('?around=')
      ? Promise.reject(new ApiError(404, { code: 'message_not_found' }))
      : answer(path),
  );
  await render();
  await waitFor(() =>
    expect(mockSay).toHaveBeenCalledWith({ text: t.inbox.chatSearch.unreachable }),
  );
  expect(mockSetParams).toHaveBeenCalledWith({ msg: undefined });
  expect(aroundCalls()).toHaveLength(1);
});
