import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { forgetReopens, useThreadReopen } from '../../composer/use-thread-reopen';
import { useSendFile } from '../../composer/send-file';
import { useSendStagedFile } from '../../saved-replies/hooks/send-staged';
import { message, PHONE } from '../../shared/thread-fixtures';
import { refreshInbox, touchInbox } from './inbox-sync';
import { useForward } from './use-forward';
import { useMessageAction, useSendMessage } from './use-thread';

// Every way a chat sends (text, template, quote, file, saved reply, forward, retry, reopen) goes
// through the one inbox refresh (owner 2026-10-27), and the ones that know their row touch the list.

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl: async () => ({ data: {}, error: null }) }) } },
}));
jest.mock('./inbox-sync', () => ({ refreshInbox: jest.fn(async () => undefined), touchInbox: jest.fn(async () => undefined) }));

const row = message({ id: 'p1', body: 'وصلت', status: 'sent' });
const refreshed = jest.mocked(refreshInbox);
const touched = jest.mocked(touchInbox);

async function run<T>(hook: () => { mutate: (input: T) => void }, input: T) {
  const client = createTestQueryClient();
  const { result } = await renderHook(hook, { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(refreshed).toHaveBeenCalled());
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(row);
});

test('a text and a template (the quote sheet too) touch the list, then refresh the inbox', async () => {
  const client = await run(() => useSendMessage(PHONE), { id: 'p1', out: { kind: 'text', text: 'وصلت' } });
  expect(touched).toHaveBeenCalledWith(client, expect.objectContaining({ id: 'p1', phone_e164: PHONE, status: 'queued' }));
  expect(refreshed).toHaveBeenCalledWith(client, PHONE);
  const out = { kind: 'template' as const, key: 'renewal_due', params: {}, preview: 'عرض سعر' };
  await run(() => useSendMessage(PHONE), { id: 'p2', out });
  expect(touched).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ body: 'عرض سعر' }));
});

test('a refused send still refreshes the inbox, so the list shows the truth again', async () => {
  mockApiSend.mockRejectedValue(new Error('refused'));
  const client = await run(() => useSendMessage(PHONE), { id: 'p1', out: { kind: 'text', text: 'وصلت' } });
  expect(refreshed).toHaveBeenCalledWith(client, PHONE);
});

test('a file and a saved reply attachment touch the list with the API row', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path.endsWith('upload-url') ? { bucket: 'wa-media', path: 'out/x.pdf', token: 't' } : row);
  const file = { mime: 'application/pdf', bytes: new ArrayBuffer(3), size: 3, filename: 'a.pdf' };
  await run(() => useSendFile(PHONE), { phone: PHONE, file, id: 'p1', maxBytes: 1024 });
  expect(touched).toHaveBeenCalledWith(expect.anything(), row);
  expect(refreshed).toHaveBeenCalledWith(expect.anything(), PHONE);
  jest.clearAllMocks();
  mockApiSend.mockResolvedValueOnce({ path: 'out/y.pdf', filename: 'y.pdf' }).mockResolvedValue(row);
  const staged = { replyId: 'r1', requestId: 'p3', file: { path: 'y.pdf', mime: 'application/pdf', filename: 'y.pdf', size: 3 } };
  await run(() => useSendStagedFile(PHONE), staged as never);
  expect(touched).toHaveBeenCalledWith(expect.anything(), row);
  expect(refreshed).toHaveBeenCalledWith(expect.anything(), PHONE);
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
