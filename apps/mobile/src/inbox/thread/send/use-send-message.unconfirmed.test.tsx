import { SEND_UNCONFIRMED } from '@ab/client-core';
import type { ThreadDetail } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { message, PHONE } from '@/inbox/shared/thread-fixtures';
import { clearChatMemory } from '@/inbox/thread/anchor';
import { refreshInbox, refreshLists } from '@/inbox/thread/hooks/inbox-sync';
import { type ThreadCache, threadKey, threadMessages } from '@/inbox/thread/hooks/thread-cache';
import { useSendMessage } from '@/inbox/thread/hooks/use-thread';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { PINS } from './pinned-send';
import { chatSendError } from './send-error';

// docs/44 BUG7, the final rule: no answer (deadline, network, 5xx) keeps the bubble «unconfirmed»,
// puts the text back and pins the id; only an ANSWER (2xx or 4xx) releases it. Nothing from reads.

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

test('no answer: «unconfirmed» bubble, the text back, the id pinned, only the lists re-read', async () => {
  const { hook, rows, send } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  await send(box('req-1', 'وصلت'));
  expect(rows().map((m) => [m.id, m.error_code])).toEqual([['m0', null], ['req-1', SEND_UNCONFIRMED]]);
  expect(getComposerText(PHONE)).toBe('وصلت');
  expect(PINS.box.pinned(PHONE)).toBe('req-1');
  expect(refreshInbox).not.toHaveBeenCalled();
  expect(refreshLists).toHaveBeenCalled();
  expect(chatSendError(hook.result.current.error)).toBe(t.inbox.error.send_unconfirmed);
});

test('an edited retry with no answer again: its bubble and text stay, the pin stays', async () => {
  const { rows, send } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  await send(box('req-1', 'وصلت'));
  setComposerText(PHONE, '');
  await send(box('req-1', 'وصلت الآن'));
  expect(rows().map((m) => [m.id, m.body])).toEqual([['m0', 'قديمة'], ['req-1', 'وصلت الآن']]);
  expect(getComposerText(PHONE)).toBe('وصلت الآن');
  expect(PINS.box.pinned(PHONE)).toBe('req-1');
});

test('a 2xx with the pinned id and the same text: only the server row stays, the pin goes', async () => {
  const { rows, send } = await setup();
  mockApiSend.mockRejectedValueOnce(noAnswer()).mockResolvedValue(serverRow('وصلت'));
  await send(box('req-1', 'وصلت'));
  setComposerText(PHONE, '');
  await send(box('req-1', 'وصلت'));
  expect(rows().map((m) => m.id)).toEqual(['m0', 'srv-1']);
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
  expect(PINS.box.replayed(PHONE)).toBe(false);
});

test('M1: a 2xx with the FIRST message: the note, the edit back in the box, the pin released', async () => {
  const { rows, send } = await setup();
  mockApiSend.mockRejectedValueOnce(noAnswer()).mockResolvedValue(serverRow('وصلت'));
  await send(box('req-1', 'وصلت'));
  setComposerText(PHONE, '');
  await send(box('req-1', 'وصلت الآن'));
  expect(PINS.box.replayed(PHONE)).toBe(true);
  expect(getComposerText(PHONE)).toBe('وصلت الآن');
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
  expect(rows().map((m) => m.id)).toEqual(['m0', 'srv-1']);
});

test('a 4xx answer releases the pin and rolls the bubble back; a 5xx pins it', async () => {
  const { rows, send } = await setup();
  mockApiSend.mockRejectedValueOnce(new ApiError(502, null));
  await send(box('req-5', 'وصلت'));
  expect(PINS.box.pinned(PHONE)).toBe('req-5');
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'session_closed' }));
  await send(box('req-5', 'وصلت'));
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
  expect(rows().map((m) => m.id)).toEqual(['m0']);
  // An answer: refreshSent (the lists, and the newest page when the chat is shown).
  expect(refreshLists).toHaveBeenCalled();
});

test('no answer pins even when the bubble is no longer in the cache', async () => {
  const { client, send } = await setup();
  mockApiSend.mockImplementation(async () => {
    client.setQueryData<ThreadCache>(threadKey(PHONE), { pages: [page()], pageParams: [null] });
    throw noAnswer();
  });
  await send(box('req-8', 'وصلت'));
  expect(PINS.box.pinned(PHONE)).toBe('req-8');
});

test('a template never pins; a send settling after sign-out writes nothing back', async () => {
  const { send } = await setup();
  mockApiSend.mockRejectedValue(noAnswer());
  const out = { kind: 'template' as const, key: 'renewal_due', params: {}, preview: 'عرض سعر' };
  await send({ id: 'tpl-1', out });
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
  let fail: (e: Error) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((_, reject) => (fail = reject)));
  const { hook } = await setup();
  await act(async () => hook.result.current.mutate(box('req-9', 'سر')));
  clearChatMemory();
  await act(async () => fail(noAnswer()));
  await waitFor(() => expect(hook.result.current.isError).toBe(true));
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
  expect(getComposerText(PHONE)).toBe('');
});
