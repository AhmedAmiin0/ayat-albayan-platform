import type { ThreadDetail } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { clearChatMemory } from '@/inbox/thread/anchor';
import { type ThreadCache, threadKey, threadMessages } from '@/inbox/thread/hooks/thread-cache';
import { useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { PINS } from './pinned-send';

// docs/44 BUG7 (review 3 of #667): a 4xx such as 409 session_closed is decided BEFORE the server's
// dedup lookup, so an id it released may still replay the first message on a same-text resend:
// the replay check runs on every 2xx text answer.

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('@/inbox/thread/hooks/inbox-sync', () => ({
  refreshInbox: jest.fn(async () => undefined),
  refreshLists: jest.fn(),
  touchInbox: jest.fn(async () => undefined),
}));

const old = message({ id: 'm0', body: 'قديمة', created_at: '2026-01-01T00:00:00Z', status: 'read' });
const page = (rows = [old]) => ({ messages: rows, has_more: false }) as unknown as ThreadDetail;
const noAnswer = () => new TypeError('Network request failed');
const box = (id: string, text: string) => ({ id, out: { kind: 'text' as const, text }, pin: 'box' as const });
const serverRow = (body: string) => message({ id: 'srv-1', body, status: 'sent' });

async function setup() {
  const client = createTestQueryClient();
  client.setQueryData<ThreadCache>(threadKey(PHONE), { pages: [page()], pageParams: [null] });
  const wrapper = queryWrapper(client);
  const hook = await renderHook(() => useSendMessage(PHONE), { wrapper });
  const rows = () => threadMessages(client.getQueryData<ThreadCache>(threadKey(PHONE)));
  const send = async (input: Parameters<typeof hook.result.current.mutate>[0]) => {
    await act(async () => hook.result.current.mutate(input));
    await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  };
  return { client, hook, rows, send };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearChatMemory();
});

test('a 4xx released the pin, then a same-id 2xx with the FIRST message: still the M1 note', async () => {
  // 409 session_closed runs before the dedup lookup: the released id may still replay the first.
  const { send } = await setup();
  mockApiSend
    .mockRejectedValueOnce(noAnswer())
    .mockRejectedValueOnce(new ApiError(409, { code: 'session_closed' }))
    .mockResolvedValue(serverRow('وصلت'));
  await send(box('req-1', 'وصلت'));
  setComposerText(PHONE, '');
  await send(box('req-1', 'وصلت الآن'));
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
  setComposerText(PHONE, '');
  await send(box('req-1', 'وصلت الآن'));
  expect(PINS.box.replayed(PHONE)).toBe(true);
  expect(getComposerText(PHONE)).toBe('وصلت الآن');
});

