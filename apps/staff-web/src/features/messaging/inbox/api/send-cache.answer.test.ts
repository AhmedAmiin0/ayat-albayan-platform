import { UNREAD_COUNT_KEY } from '@ab/client-core';
import { InfiniteQueryObserver, QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { detail, message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { refreshSentLists, rereadSentChat, showAnswer } from './send-cache';
import { threadQuery } from './thread-query';
import { threadKeys } from './keys';

// A send writes the API's row into the open chat; a row new to the chat also reads its newest page,
// because the delta anchors on the newest row held and would skip a row that landed before it.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const held = message({ id: 'm1', created_at: '2026-11-07T10:00:00Z' });
const listFn = vi.fn(async () => ({ items: [thread()], total: 1 }));
const badgeFn = vi.fn(async () => 3);
const chatReads = () =>
  apiFetch.mock.calls.filter(([p]) => String(p).startsWith('/threads/')).length;

/** An open chat, a shown list and the badge, each observed (so an invalidation re-reads it). */
async function shown() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  apiFetch.mockResolvedValue(detail([held]));
  const chat = new InfiniteQueryObserver(client, threadQuery(PHONE));
  const list = new QueryObserver(client, { queryKey: threadKeys.list(''), queryFn: listFn });
  const badge = new QueryObserver(client, { queryKey: UNREAD_COUNT_KEY, queryFn: badgeFn });
  const offs = [chat, list, badge].map((o) => o.subscribe(() => undefined));
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  apiFetch.mockClear();
  listFn.mockClear();
  badgeFn.mockClear();
  return { client, off: () => offs.forEach((off) => off()) };
}

beforeEach(() => apiFetch.mockReset());
afterEach(() => vi.restoreAllMocks());

it('a send: 1 newest-page read brings a row that landed before it', async () => {
  const { client, off } = await shown();
  const inbound = message({ id: 'm2', created_at: '2026-11-07T10:01:00Z' });
  const row = message({
    id: 'm3',
    direction: 'outbound',
    status: 'queued',
    created_at: '2026-11-07T10:02:00Z',
  });
  apiFetch.mockResolvedValue(detail([held, inbound, row]));
  showAnswer(client, row);
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  await vi.waitFor(() => expect(chatReads()).toBe(1));
  expect([listFn.mock.calls.length, badgeFn.mock.calls.length]).toEqual([1, 1]);
  const ids = client.getQueryData(threadQuery(PHONE).queryKey)?.pages[0]?.messages.map((m) => m.id);
  expect(ids).toEqual(['m1', 'm2', 'm3']);
  off();
});

it('a bubble action: its row takes the held one by id, never a second bubble', async () => {
  const { client, off } = await shown();
  showAnswer(client, { ...held, status: 'sent' });
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  expect(chatReads()).toBe(0);
  const rows = client.getQueryData(threadQuery(PHONE).queryKey)?.pages[0]?.messages;
  expect(rows?.map((m) => [m.id, m.status])).toEqual([['m1', 'sent']]);
  off();
});

it('a row of a chat not cached: only the lists and the badge read', async () => {
  const { client, off } = await shown();
  showAnswer(client, message({ id: 'x', phone_e164: '+966500000001' }));
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  expect([chatReads(), listFn.mock.calls.length, badgeFn.mock.calls.length]).toEqual([0, 1, 1]);
  expect(client.getQueryData(threadQuery('+966500000001').queryKey)).toBeUndefined();
  off();
});

it('a forward (no row of the open chat): the lists and the badge read once each', async () => {
  const { client, off } = await shown();
  refreshSentLists(client);
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  expect([chatReads(), listFn.mock.calls.length, badgeFn.mock.calls.length]).toEqual([0, 1, 1]);
  off();
});

it('a refusal whose window closed: the chat, the lists and the badge read once each', async () => {
  const { client, off } = await shown();
  await rereadSentChat(client, PHONE);
  await vi.waitFor(() => expect(client.isFetching()).toBe(0));
  expect([chatReads(), listFn.mock.calls.length, badgeFn.mock.calls.length]).toEqual([1, 1, 1]);
  off();
});
