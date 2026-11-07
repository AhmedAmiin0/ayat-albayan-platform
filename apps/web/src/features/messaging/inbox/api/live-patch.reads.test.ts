import { canReply } from '@ab/shared';
import type { MessageView, ThreadDetail, ThreadView } from '@ab/shared';
import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { threadsQuery } from './api';
import { patchLiveCaches } from './live-patch';
import { heldRead, live, msg, PHONE, thread } from './patch-fixtures';
import { threadQuery } from './thread-query';

// docs/44 K1: the live patch is visual only and no read is folded. A read in flight when the
// event lands is cancelled (never committed after the patch); the event's re-read starts after
// it (cancelRefetch: true, as live.ts) and lands exactly what the server sent.

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const KEY = threadQuery(PHONE).queryKey;
const LIST = threadsQuery({ page: 1 });
const page = (...messages: MessageView[]) => ({ messages, has_more: false }) as ThreadDetail;
const list = (...items: ThreadView[]) => ({ items, total: items.length });
const first = (client: QueryClient) => client.getQueryData(KEY)?.pages[0]?.messages[0];
const listed = (client: QueryClient) => client.getQueryData(LIST.queryKey)?.items[0]?.last_status;
/** The event's re-read, as live.ts runs it. */
const reread = (client: QueryClient, queryKey: QueryKey) =>
  client.refetchQueries({ queryKey }, { cancelRefetch: true });

async function opened(m: MessageView) {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(page(m));
  await client.infiniteQuery(threadQuery(PHONE));
  return client;
}

/** A read of `queryKey` held in flight (the request is out) until `resolve`. */
async function inFlight(client: QueryClient, queryKey: QueryKey) {
  const stale = heldRead<unknown>();
  const calls = mockApiFetch.mock.calls.length;
  mockApiFetch.mockReturnValueOnce(stale.promise);
  const done = client.refetchQueries({ queryKey }).catch(() => undefined);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(calls + 1));
  return { resolve: stale.resolve, done };
}

beforeEach(() => mockApiFetch.mockReset());

it('an older chat read in flight is cancelled by the patch; the fresh read lands the server', async () => {
  const client = await opened(msg('a', 'sent'));
  const old = await inFlight(client, KEY);
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  old.resolve(page(msg('a', 'sent')));
  await old.done;
  expect(first(client)?.status).toBe('delivered');
  const fresh = page(msg('a', 'delivered', { delivered_at: '2026-11-07T10:01' }));
  mockApiFetch.mockResolvedValueOnce(fresh);
  await reread(client, KEY);
  expect(first(client)).toEqual(fresh.messages[0]);
});

it('an older list read in flight is cancelled too; the fresh read is the truth', async () => {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(list(thread('a', 'sent')));
  await client.query(LIST);
  const old = await inFlight(client, LIST.queryKey);
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  old.resolve(list(thread('a', 'sent')));
  await old.done;
  expect(listed(client)).toBe('delivered');
  mockApiFetch.mockResolvedValueOnce(list(thread('a', 'read')));
  await reread(client, LIST.queryKey);
  expect(listed(client)).toBe('read');
});

it('a {phone}-only re-read never joins an older read: it starts after the event', async () => {
  const client = await opened(msg('a', 'queued'));
  const old = await inFlight(client, KEY);
  mockApiFetch.mockResolvedValueOnce(page(msg('a', 'sent')));
  const fresh = reread(client, KEY);
  old.resolve(page(msg('a', 'queued')));
  await Promise.all([fresh, old.done]);
  expect(first(client)?.status).toBe('sent');
});

it('a sent event moves the tick; the fresh read makes the bubble replyable', async () => {
  const client = await opened(msg('a', 'queued', { replyable: false }));
  patchLiveCaches(client, PHONE, [live('a', 'sent')]);
  expect([first(client)?.status, canReply(first(client) ?? {})]).toEqual(['sent', false]);
  mockApiFetch.mockResolvedValueOnce(page(msg('a', 'sent', { replyable: true })));
  await reread(client, KEY);
  expect(canReply(first(client) ?? {})).toBe(true);
});

it('a re-queue (failed → queued) shows queued, by the patch and by the fresh read', async () => {
  const client = await opened(msg('a', 'failed'));
  patchLiveCaches(client, PHONE, [live('a', 'queued')]);
  expect(first(client)?.status).toBe('queued');
  mockApiFetch.mockResolvedValueOnce(page(msg('a', 'queued')));
  await reread(client, KEY);
  expect(first(client)?.status).toBe('queued');
});
