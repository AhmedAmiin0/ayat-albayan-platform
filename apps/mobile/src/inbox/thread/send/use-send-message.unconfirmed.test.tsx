import type { ThreadDetail } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { refreshInbox, refreshLists } from '@/inbox/thread/hooks/inbox-sync';
import { type ThreadCache, threadKey, threadMessages } from '@/inbox/thread/hooks/thread-cache';
import { useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { boxPin, clearHeldSends } from './pinned-send';
import { useResolveHeld } from './resolve-held';
import { chatSendError } from './send-error';
import { SEND_UNCONFIRMED } from '@ab/client-core';

// docs/44 BUG7: a send that ends with no answer keeps its bubble «unconfirmed» and re-reads the
// chat before saying it failed; only a box text pins its id, and any read showing its server row
// releases the pin and the bubble (review of PR #667: H1, L1, M2).

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
  const useBoth = () => {
    useResolveHeld(PHONE);
    return useSendMessage(PHONE);
  };
  const { result } = await renderHook(useBoth, { wrapper });
  const rows = () => threadMessages(client.getQueryData<ThreadCache>(threadKey(PHONE)));
  return { client, result, rows };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearHeldSends();
});

test('no answer: the bubble stays «unconfirmed», the chat is re-read, the box text pins', async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page());
  await act(async () => result.current.mutate({ id: 'req-1', out: text('وصلت'), box: true }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockApiFetch.mock.calls[0]?.[0]).toBe(`/threads/${encodeURIComponent(PHONE)}`);
  expect(rows().map((m) => [m.id, m.error_code])).toEqual([['m0', null], ['req-1', SEND_UNCONFIRMED]]);
  // Only the lists re-read: a full chat read would drop the bubble before the retry.
  expect(refreshInbox).not.toHaveBeenCalled();
  expect(refreshLists).toHaveBeenCalled();
  expect(chatSendError(result.current.error)).toBe(t.inbox.error.send_unconfirmed);
  expect(boxPin(PHONE)).toBe('req-1');
});

test('a template with no answer never pins the box: the next text keeps its own id', async () => {
  const { result } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page());
  const out = { kind: 'template' as const, key: 'renewal_due', params: {}, preview: 'عرض سعر' };
  await act(async () => result.current.mutate({ id: 'tpl-1', out }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(boxPin(PHONE)).toBeUndefined();
});

test('a later read showing the FIRST send releases the pin and drops the bubble (no twice)', async () => {
  const { client, result, rows } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page());
  await act(async () => result.current.mutate({ id: 'req-1', out: text('وصلت'), box: true }));
  await waitFor(() => expect(boxPin(PHONE)).toBe('req-1'));
  // The server committed it at 31 s: the page poll brings it (mergeNewest keeps the provisional).
  const pages = [page([old, rows().at(-1) ?? old, serverRow('وصلت')])];
  const read = { pages, pageParams: [null] };
  await act(async () => client.setQueryData<ThreadCache>(threadKey(PHONE), read));
  await waitFor(() => expect(boxPin(PHONE)).toBeUndefined());
  expect(rows().map((m) => m.id)).toEqual(['m0', 'srv-1']);
});

test('a read with another text (an edit) does not release it', async () => {
  const { client, result } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page());
  await act(async () => result.current.mutate({ id: 'req-1', out: text('وصلت'), box: true }));
  await waitFor(() => expect(boxPin(PHONE)).toBe('req-1'));
  const pages = [page([old, serverRow('وصلت الآن')])];
  const read = { pages, pageParams: [null] };
  await act(async () => client.setQueryData<ThreadCache>(threadKey(PHONE), read));
  expect(boxPin(PHONE)).toBe('req-1');
});

test('no answer, but the re-read shows the row: the send succeeds with it, no bubble twice', async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  mockApiFetch.mockResolvedValue(page([old, serverRow('وصلت')]));
  await act(async () => result.current.mutate({ id: 'req-9', out: text('وصلت'), box: true }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(rows().map((m) => m.id)).toEqual(['m0', 'srv-1']);
  expect(boxPin(PHONE)).toBeUndefined();
  expect(refreshInbox).toHaveBeenCalled();
});

test('a 5xx is «no answer» too (a 502 from the load balancer may have the row)', async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(new ApiError(502, null));
  mockApiFetch.mockResolvedValue(page());
  await act(async () => result.current.mutate({ id: 'req-5', out: text('وصلت'), box: true }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(rows().at(-1)?.error_code).toBe(SEND_UNCONFIRMED);
  expect(boxPin(PHONE)).toBe('req-5');
});

test("the API's refusal (a 4xx) takes the bubble out and re-reads the chat", async () => {
  const { result, rows } = await setup();
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'session_closed' }));
  await act(async () => result.current.mutate({ id: 'req-7', out: text('وصلت'), box: true }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(rows().map((m) => m.id)).toEqual(['m0']);
  expect(refreshInbox).toHaveBeenCalled();
  expect(chatSendError(result.current.error)).toBe(t.inbox.error.session_closed);
  expect(boxPin(PHONE)).toBeUndefined();
});
