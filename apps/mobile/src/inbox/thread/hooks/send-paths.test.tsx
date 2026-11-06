import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { forgetReopens, useThreadReopen } from '@/inbox/composer/use-thread-reopen';
import { useSendFile } from '@/inbox/composer/send-file';
import { useSendStagedFile } from '@/inbox/saved-replies/hooks/send-staged';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { refreshInbox, refreshLists, touchInbox } from './inbox-sync';
import { useForward } from './use-forward';
import { useMessageAction, useSendMessage } from './use-thread';

// Every way a chat sends (text, template, quote, file, saved reply, forward, retry, reopen) goes
// through the inbox refresh (owner 2026-10-27), and the ones that know their row touch the list. A
// send into one chat refreshes its lists and its newest page only (refreshSent, docs/43 AU4).

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) }) } },
}));
jest.mock('./inbox-sync', () => ({
  refreshInbox: jest.fn(async () => undefined),
  refreshLists: jest.fn(),
  touchInbox: jest.fn(async () => undefined),
}));

const row = message({ id: 'p1', body: 'وصلت', status: 'sent' });
const refreshed = jest.mocked(refreshInbox);
/** refreshSent's lists step: a send into one chat (its newest page: send-refresh.test). */
const sent = jest.mocked(refreshLists);
const touched = jest.mocked(touchInbox);

async function run<T>(hook: () => { mutate: (input: T) => void }, input: T) {
  const client = createTestQueryClient();
  const { result } = await renderHook(hook, { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(refreshed.mock.calls.length + sent.mock.calls.length).toBeGreaterThan(0));
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(row);
});

test('a text and a template (the quote sheet too) touch the list, then refresh the newest page', async () => {
  const client = await run(() => useSendMessage(PHONE), { id: 'p1', out: { kind: 'text', text: 'وصلت' } });
  expect(touched).toHaveBeenCalledWith(client, expect.objectContaining({ id: 'p1', phone_e164: PHONE, status: 'queued' }));
  expect(sent).toHaveBeenCalledWith(client);
  expect(refreshed).not.toHaveBeenCalled();
  const out = { kind: 'template' as const, key: 'renewal_due', params: {}, preview: 'عرض سعر' };
  await run(() => useSendMessage(PHONE), { id: 'p2', out });
  expect(touched).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ body: 'عرض سعر' }));
});

test('a refused send still refreshes the inbox, so the list shows the truth again', async () => {
  mockApiSend.mockRejectedValue(new Error('refused'));
  const client = await run(() => useSendMessage(PHONE), { id: 'p1', out: { kind: 'text', text: 'وصلت' } });
  expect(sent).toHaveBeenCalledWith(client);
});

test('a file and a saved reply attachment touch the list with the API row', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path.endsWith('upload-url') ? { bucket: 'wa-media', path: 'out/x.pdf', token: 't' } : row);
  const file = { mime: 'application/pdf', bytes: new ArrayBuffer(3), size: 3, filename: 'a.pdf' };
  await run(() => useSendFile(PHONE), { phone: PHONE, file, id: 'p1', maxBytes: 1024 });
  expect(touched).toHaveBeenCalledWith(expect.anything(), row);
  expect(sent).toHaveBeenCalledWith(expect.anything());
  jest.clearAllMocks();
  mockApiSend.mockResolvedValueOnce({ path: 'out/y.pdf', filename: 'y.pdf' }).mockResolvedValue(row);
  const staged = { replyId: 'r1', requestId: 'p3', file: { path: 'y.pdf', mime: 'application/pdf', filename: 'y.pdf', size: 3 } };
  await run(() => useSendStagedFile(PHONE), staged as never);
  expect(touched).toHaveBeenCalledWith(expect.anything(), row);
  expect(sent).toHaveBeenCalledWith(expect.anything());
});

test('a forward refreshes every chat; a retry refreshes its own', async () => {
  mockApiSend.mockResolvedValue({ results: [] });
  await run(() => useForward(), { messageId: 'm1', targets: [PHONE], clientRequestId: 'p1' } as never);
  expect(refreshed).toHaveBeenCalledWith(expect.anything());
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(row);
  await run(() => useMessageAction(PHONE, 'retry'), 'm3');
  expect(refreshed).toHaveBeenCalledWith(expect.anything(), PHONE);
});

test('a queued reopen template refreshes the inbox like a send', async () => {
  forgetReopens();
  mockApiSend.mockResolvedValue({ template: 'template_queued' });
  const client = createTestQueryClient();
  await renderHook(() => useThreadReopen(PHONE, true), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(refreshed).toHaveBeenCalledWith(client, PHONE));
});
