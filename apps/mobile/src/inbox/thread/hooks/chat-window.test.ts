import { QueryClient } from '@tanstack/react-query';
import { thread } from '../../shared/thread-fixtures';
import { chatMaySend, sendState } from './chat-window';
import { threadKey } from './thread-cache';

const PHONE = '+966501112223';
const NOW = new Date('2026-10-28T10:00:00Z');
// gcTime Infinity: no gc timer keeps the worker alive.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

function cached(lastInbound: string | null, tries = false) {
  const client = newClient();
  const row = { ...thread, last_inbound_at: lastInbound, ...(tries ? { try_after_window: true } : {}) };
  const page = { thread: row, messages: [], has_more: false, lessons: [] };
  client.setQueryData(threadKey(PHONE), { pages: [page], pageParams: [undefined] });
  return client;
}

test('within 24 h of the family’s last message: sent; an unknown chat: not', () => {
  expect(chatMaySend(cached('2026-10-28T09:00:00Z'), PHONE, NOW)).toBe(true);
  expect(chatMaySend(cached(null), PHONE, NOW)).toBe(false);
  expect(chatMaySend(newClient(), PHONE, NOW)).toBe(false);
});

test('older than 24 h (owner 2026-11-01): tried on a Kapso chat line as a text, else not', () => {
  expect(chatMaySend(cached('2026-10-27T09:00:00Z', true), PHONE, NOW)).toBe(true);
  expect(chatMaySend(cached('2026-10-27T09:00:00Z'), PHONE, NOW)).toBe(false);
});

test('sendState reads the window by the device clock', () => {
  expect(sendState({ last_inbound_at: '2026-10-28T09:00:00Z' }, NOW)).toEqual({ open: true, tryAfterWindow: undefined });
  expect(sendState(null, NOW).open).toBe(false);
});
