import type { MessageView, ThreadDetail } from '@ab/shared';
import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { heldRead, msg, PHONE } from './patch-fixtures';
import { rereadChat } from './reread';
import { threadQuery } from './thread-query';

// docs/44 K1 (#693 review): a chained chat re-read cancelled by another «تحميل الأقدم» runs once
// more after it, and a deferred re-read never starts while the window has no focus (a full read
// stamps read_at and sends Meta a read receipt).

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const KEY = threadQuery(PHONE).queryKey;
const page = (has_more: boolean, ...messages: MessageView[]) =>
  ({ messages, has_more }) as ThreadDetail;
const firsts = (client: QueryClient) =>
  client.getQueryData(KEY)?.pages.map((p) => p.messages.map((m) => `${m.id}:${m.status}`));
const focused = (on: boolean) => vi.spyOn(document, 'hasFocus').mockReturnValue(on);

/** An open, shown chat with older pages and its observer (fetchNextPage = «تحميل الأقدم»). */
async function opened() {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(page(true, msg('a', 'sent')));
  await client.infiniteQuery(threadQuery(PHONE));
  const query = client.getQueryCache().find({ queryKey: KEY, exact: true });
  if (query) vi.spyOn(query, 'isActive').mockReturnValue(true);
  return { client, chat: new InfiniteQueryObserver(client, threadQuery(PHONE)) };
}

/** The next GET held in flight until `resolve`; waits until it is out. */
async function held(start: () => unknown) {
  const read = heldRead<unknown>();
  const calls = mockApiFetch.mock.calls.length;
  mockApiFetch.mockReturnValueOnce(read.promise);
  start();
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(calls + 1));
  return read;
}

beforeEach(() => {
  mockApiFetch.mockReset();
  focused(true);
});

it('a page load during the chained re-read: the re-read runs again after it', async () => {
  const { client, chat } = await opened();
  const p1 = await held(() => void chat.fetchNextPage());
  rereadChat(client, PHONE); // the event: waits for P1
  const r1 = await held(() => p1.resolve(page(true, msg('b', 'sent'))));
  const p2 = await held(() => void chat.fetchNextPage()); // a click during R: R is cancelled
  mockApiFetch
    .mockResolvedValueOnce(page(true, msg('new', 'delivered'), msg('a', 'read')))
    .mockResolvedValueOnce(page(true, msg('b', 'read')))
    .mockResolvedValueOnce(page(false, msg('c', 'read')));
  p2.resolve(page(false, msg('c', 'sent')));
  r1.resolve(page(true, msg('a', 'sent')));
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(7));
  await vi.waitFor(() =>
    expect(firsts(client)).toEqual([['new:delivered', 'a:read'], ['b:read'], ['c:read']]),
  );
});

it('focus lost before a deferred re-read starts: no GET; with focus back the next one runs', async () => {
  const { client, chat } = await opened();
  const p1 = await held(() => void chat.fetchNextPage());
  rereadChat(client, PHONE);
  focused(false); // the agent left the window while the page loaded
  p1.resolve(page(false, msg('b', 'sent')));
  await chat.getCurrentQuery().promise;
  await new Promise((r) => setTimeout(r, 0));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  rereadChat(client, PHONE); // still no focus: nothing either
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  focused(true);
  mockApiFetch.mockResolvedValue(page(false, msg('a', 'read')));
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(3));
});

it('the chat left during a re-read after an older page: the chain stops (no endless loop)', async () => {
  const { client, chat } = await opened();
  const p1 = await held(() => void chat.fetchNextPage());
  p1.resolve(page(false, msg('b', 'sent')));
  await chat.getCurrentQuery().promise; // P1's fetchMeta (fetchMore) stays in state
  const r = await held(() => rereadChat(client, PHONE));
  const query = client.getQueryCache().find({ queryKey: KEY, exact: true });
  if (!query) throw new Error('no chat query');
  vi.spyOn(query, 'isActive').mockReturnValue(false);
  await query.cancel({ revert: true }); // what removing the last observer does: back to P1's meta
  r.resolve(page(true, msg('a', 'read')));
  await new Promise((done) => setTimeout(done, 20)); // never runs while a re-read loop spins
  expect(mockApiFetch).toHaveBeenCalledTimes(3);
});

it('a page load that already landed holds no later event back: each event re-reads', async () => {
  const { client, chat } = await opened();
  const p1 = await held(() => void chat.fetchNextPage());
  p1.resolve(page(false, msg('b', 'sent')));
  await chat.getCurrentQuery().promise;
  mockApiFetch.mockResolvedValue(page(true, msg('a', 'read'))); // two pages each time
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(4));
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(6));
});
