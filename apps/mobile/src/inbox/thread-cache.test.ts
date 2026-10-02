import {
  appendMessage,
  provisionalMessage,
  removeMessage,
  replaceMessage,
  threadHref,
  threadKey,
  threadMessages,
  threadPath,
} from './thread-cache';
import { cachedThread, delivered, detail, failed, inbound, message, NOW, PHONE } from './thread-fixtures';

const older = message({ id: 'm0', body: 'قديمة', created_at: '2026-09-30T08:00:00Z' });

test('paths: the + is encoded for the route and the API; the key keeps the raw phone', () => {
  expect(threadHref(PHONE)).toBe('/inbox/thread/%2B966552147730');
  expect(threadPath(PHONE)).toBe('/threads/%2B966552147730');
  expect(threadKey(PHONE)).toEqual(['threads', PHONE]);
});

test('messages run oldest → newest across pages, each row once', () => {
  const data = cachedThread(detail([inbound, delivered]), detail([older, inbound]));
  expect(threadMessages(data).map((m) => m.id)).toEqual(['m0', 'm1', 'm2']);
  expect(threadMessages(undefined)).toEqual([]);
});

test('append goes to the end of the newest page only', () => {
  const data = cachedThread(detail([inbound]), detail([older]));
  const next = appendMessage(data, delivered);
  expect(next?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  expect(next?.pages[1]?.messages.map((m) => m.id)).toEqual(['m0']);
  expect(appendMessage(undefined, delivered)).toBeUndefined();
});

test('replace swaps the row by id wherever it is; remove rolls it back', () => {
  const temp = provisionalMessage({ id: 'tmp', phone: PHONE, body: 'x', now: NOW });
  const data = cachedThread(detail([inbound, temp]));
  const replaced = replaceMessage(data, 'tmp', failed);
  expect(threadMessages(replaced).map((m) => m.id)).toEqual(['m1', 'm3']);
  expect(threadMessages(removeMessage(data, 'tmp')).map((m) => m.id)).toEqual(['m1']);
  expect(replaceMessage(undefined, 'tmp', failed)).toBeUndefined();
});

test('a provisional row is our queued text, with no wa.me link yet', () => {
  const row = provisionalMessage({ id: 'r1', phone: PHONE, body: 'مرحبا', templateKey: 'renewal_due', now: NOW });
  expect(row).toMatchObject({
    id: 'r1',
    direction: 'outbound',
    status: 'queued',
    body: 'مرحبا',
    template_key: 'renewal_due',
    created_at: NOW.toISOString(),
    click_to_chat: null,
  });
  expect(provisionalMessage({ id: 'r2', phone: PHONE, body: 'x' }).template_key).toBeNull();
});
