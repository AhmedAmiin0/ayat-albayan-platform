import { act, renderHook, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { clearChatMemory } from '@/inbox/thread/anchor';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useQuoteSend } from './use-quote-sheet';

// docs/44 BUG7 (review of PR #667): «عرض سعر» keeps one id per chat after no answer, also when
// the sheet closes and opens again, until an answer; the first offer answering a retry is said.

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

const ids = () =>
  mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);

async function open(onSent = jest.fn()) {
  const wrapper = queryWrapper(createTestQueryClient());
  const hook = await renderHook(() => useQuoteSend(PHONE, onSent), { wrapper });
  const send = async (text: string) => {
    await act(async () => hook.result.current.send(text));
    await waitFor(() => expect(hook.result.current.pending).toBe(false));
  };
  return { hook, send, onSent };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearChatMemory();
});

test('no answer, the sheet closed and opened again: the same id; an answer: a new one', async () => {
  mockApiSend.mockRejectedValue(new TypeError('Network request failed'));
  const first = await open();
  await first.send('العرض');
  await first.hook.unmount();
  mockApiSend.mockResolvedValue(message({ id: 'srv', body: 'العرض', status: 'sent' }));
  const again = await open();
  await again.send('العرض');
  expect(again.onSent).toHaveBeenCalled();
  await again.send('عرض آخر');
  expect(ids()[1]).toBe(ids()[0]);
  expect(ids()[2]).not.toBe(ids()[0]);
});

test('a retry answered with the FIRST offer keeps the sheet open with the note', async () => {
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed'));
  const sheet = await open();
  await sheet.send('العرض');
  mockApiSend.mockResolvedValue(message({ id: 'srv', body: 'العرض', status: 'sent' }));
  await sheet.send('عرض آخر');
  expect(sheet.onSent).not.toHaveBeenCalled();
  expect(sheet.hook.result.current.error).toBe(t.inbox.error.send_replayed);
});
