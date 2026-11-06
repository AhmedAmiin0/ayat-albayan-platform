import type { ThreadDetail } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError as HttpError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { refreshInbox, refreshLists } from '@/inbox/thread/hooks/inbox-sync';
import { type ThreadCache, threadKey, threadMessages } from '@/inbox/thread/hooks/thread-cache';
import { useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { chatSendError } from './send-error';
import { SEND_UNCONFIRMED } from './unconfirmed';

// docs/44 BUG7: a send that ends with no answer keeps its bubble «unconfirmed», re-reads the chat
// before saying it failed, and a retry (even of an edited text) reuses the same clientRequestId.

const mockApiSend = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
jest.mock('@/inbox/thread/hooks/inbox-sync', () => ({
  refreshInbox: jest.fn(async () => undefined),
  refreshLists: jest.fn(),
  touchInbox: jest.fn(async () => undefined),
}));

const old = message({ id: 'm0', body: 'قديمة', created_at: '2026-01-01T00:00:00Z', status: 'read' });
const page = (rows = [old]) => ({ messages: rows, has_more: false }) as unknown as ThreadDetail;
const noAnswer = () => new TypeError('Network request failed');
const text = (body: string) => ({ kind: 'text' as const, text: body });
const serverRow = (body: string) =>
  message({ id: 'srv-1', body, status: 'sent', created_at: new Date().toISOString() });

async function setup() {
  const client = createTestQueryClient();
  client.setQueryData<ThreadCache>(threadKey(PHONE), { pages: [page()], pageParams: [null] });
  const wrapper = queryWrapper(client);
  const { result } = await renderHook(() => useSendMessage(PHONE), { wrapper });
  const rows = () => threadMessages(client.getQueryData<ThreadCache>(threadKey(PHONE)));
  return { client, result, rows };
}

const sentIds = () =>
  mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);

beforeEach(() => jest.clearAllMocks());

test('no answer: the bubble stays «unconfirmed», the chat is re-read, then it says so', async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page());
  await act(async () => result.current.mutate({ id: 'req-1', out: text('وصلت') }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockApiFetch.mock.calls[0]?.[0]).toBe(`/threads/${encodeURIComponent(PHONE)}`);
  expect(rows().map((m) => [m.id, m.error_code])).toEqual([['m0', null], ['req-1', SEND_UNCONFIRMED]]);
  // Only the lists re-read: a full chat read would drop the bubble before the retry.
  expect(refreshInbox).not.toHaveBeenCalled();
  expect(refreshLists).toHaveBeenCalled();
  expect(chatSendError(result.current.error)).toBe(t.inbox.error.send_unconfirmed);

  // The retry, with the text edited: the SAME clientRequestId, one bubble, the server's row.
  mockApiSend.mockResolvedValue(serverRow('وصلت'));
  await act(async () => result.current.mutate({ id: 'req-2', out: text('وصلت الآن') }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(sentIds()).toEqual(['req-1', 'req-1']);
  expect(rows().map((m) => m.id)).toEqual(['m0', 'srv-1']);

  // Confirmed: the next send is a new one.
  await act(async () => result.current.mutate({ id: 'req-3', out: text('التالية') }));
  await waitFor(() => expect(sentIds()).toHaveLength(3));
  expect(sentIds()[2]).toBe('req-3');
});

test('no answer, but the re-read shows the row: the send succeeds with it, no bubble twice', async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page([old, serverRow('وصلت')]));
  await act(async () => result.current.mutate({ id: 'req-9', out: text('وصلت') }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(rows().map((m) => m.id)).toEqual(['m0', 'srv-1']);
  expect(refreshInbox).toHaveBeenCalled();
  // Resolved: nothing pinned, the next send has its own id.
  mockApiSend.mockResolvedValue(serverRow('ثانية'));
  await act(async () => result.current.mutate({ id: 'req-10', out: text('ثانية') }));
  await waitFor(() => expect(sentIds()).toEqual(['req-9', 'req-10']));
});

test('a re-read that fails too keeps the bubble «unconfirmed»', async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockRejectedValue(noAnswer());
  await act(async () => result.current.mutate({ id: 'req-5', out: text('وصلت') }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(rows().at(-1)?.error_code).toBe(SEND_UNCONFIRMED);
  // Clean up the pin for the other tests: the retry succeeds.
  mockApiSend.mockResolvedValue(serverRow('وصلت'));
  await act(async () => result.current.mutate({ id: 'x', out: text('وصلت') }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

test("the API's refusal (an answer) takes the bubble out and re-reads the chat", async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(new HttpError(409, { code: 'session_closed' }));
  await act(async () => result.current.mutate({ id: 'req-7', out: text('وصلت') }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(rows().map((m) => m.id)).toEqual(['m0']);
  expect(refreshInbox).toHaveBeenCalled();
  expect(chatSendError(result.current.error)).toBe(t.inbox.error.session_closed);
});
