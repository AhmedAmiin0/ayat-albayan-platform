import type { ThreadDetail } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { clearChatMemory } from '@/inbox/thread/anchor';
import { type ThreadCache, threadKey } from '@/inbox/thread/hooks/thread-cache';
import { useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { PINS } from './pinned-send';

// Review of PR #694 (2): the API says `replayed` when the pinned id gave back its FIRST row; a
// correction is this send only when that row corrects the same original with the same text.
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

const page = { messages: [], has_more: false } as unknown as ThreadDetail;
const fix = (text: string) => ({
  id: 'req-1',
  out: { kind: 'text' as const, text, correctsId: 'o1' },
  pin: 'box' as const,
});
const answer = (over: object) => ({ ...message({ id: 'srv-1', status: 'sent' }), ...over });

async function sendFix(text: string) {
  const client = createTestQueryClient();
  client.setQueryData<ThreadCache>(threadKey(PHONE), { pages: [page], pageParams: [null] });
  const hook = await renderHook(() => useSendMessage(PHONE), { wrapper: queryWrapper(client) });
  await act(async () => hook.result.current.mutate(fix(text)));
  await waitFor(() => expect(hook.result.current.isPending).toBe(false));
}

beforeEach(() => {
  jest.clearAllMocks();
  clearChatMemory();
  setComposerText(PHONE, '');
});

test.each([
  ['a shortened resend', { body: 'تصحيح: الساعة الخامسة', corrects_id: 'o1' }],
  ['a plain text first, then «تعديل»', { body: 'الخامسة', corrects_id: null }],
  ['the same text on another message', { body: 'تصحيح: الخامسة', corrects_id: 'o2' }],
])('%s: the replayed row is not this correction (note, text back)', async (_, row) => {
  mockApiSend.mockResolvedValue(answer({ ...row, replayed: true }));
  await sendFix('الخامسة');
  expect(PINS.box.replayed(PHONE)).toBe(true);
  expect(getComposerText(PHONE)).toBe('الخامسة');
});

test('a retry of this very correction after a lost answer is this send', async () => {
  mockApiSend.mockResolvedValue(
    answer({ body: 'تصحيح: الخامسة', corrects_id: 'o1', replayed: true }),
  );
  await sendFix('الخامسة');
  expect(PINS.box.replayed(PHONE)).toBe(false);
  expect(getComposerText(PHONE)).toBe('');
});
