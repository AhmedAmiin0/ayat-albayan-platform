import type { MessageView, ThreadDetail } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { rereadChat } from './chat-reread';
import { patchLiveCaches } from './live-patch';
import { heldRead, live, msg, PHONE } from './patch-fixtures';
import { threadQuery } from './thread-query';

// docs/44 K1: a live event never drops «تحميل الأقدم» (a page load in flight) and never joins a
// chat's first load: the patch leaves them alone, the re-read waits for them, then runs.

const mockApiFetch = vi.fn();
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const KEY = threadQuery(PHONE).queryKey;
const page = (has_more: boolean, ...messages: MessageView[]) =>
  ({ messages, has_more }) as ThreadDetail;
const statuses = (client: QueryClient) =>
  client.getQueryData(KEY)?.pages.map((p) => p.messages[0]?.status);

/** The chat counts as on screen (the re-read's type: 'active'). */
function observe(client: QueryClient): void {
  const query = client.getQueryCache().find({ queryKey: KEY, exact: true });
  if (query) vi.spyOn(query, 'isActive').mockReturnValue(true);
}

/** A chat open with one page that has older ones, observed (the re-read's type: 'active'). */
async function opened() {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(page(true, msg('a', 'sent')));
  await client.infiniteQuery(threadQuery(PHONE));
  observe(client);
  return client;
}

/** «تحميل الأقدم» held in flight until `resolve`. */
async function pageLoad(client: QueryClient) {
  const older = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(older.promise);
  const query = client.getQueryCache().find({ queryKey: KEY, exact: true });
  const more = { meta: { fetchMore: { direction: 'forward' as const } } };
  const done = query?.fetch(undefined, more).catch(() => undefined);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  return { resolve: older.resolve, done };
}

beforeEach(() => mockApiFetch.mockReset());

it('a patch during a page load moves the tick and lets the page land', async () => {
  const client = await opened();
  const older = await pageLoad(client);
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  expect(statuses(client)).toEqual(['delivered']);
  older.resolve(page(false, msg('zz', 'read')));
  await older.done;
  expect(client.getQueryData(KEY)?.pages).toHaveLength(2);
});

it('a re-read during a page load waits for it, then reads every page again', async () => {
  const client = await opened();
  const older = await pageLoad(client);
  rereadChat(client, PHONE);
  rereadChat(client, PHONE); // a second event: still one chained re-read
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  mockApiFetch
    .mockResolvedValueOnce(page(true, msg('a', 'read')))
    .mockResolvedValueOnce(page(false, msg('zz', 'read')));
  older.resolve(page(false, msg('zz', 'sent')));
  await older.done;
  await vi.waitFor(() => expect(statuses(client)).toEqual(['read', 'read']));
  expect(mockApiFetch).toHaveBeenCalledTimes(4);
});

it('a re-read during the first load is not joined: it reads again after it', async () => {
  const client = new QueryClient();
  const first = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(first.promise);
  const opening = client.infiniteQuery(threadQuery(PHONE));
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
  observe(client);
  rereadChat(client, PHONE);
  mockApiFetch.mockResolvedValueOnce(page(false, msg('a', 'delivered')));
  first.resolve(page(false, msg('a', 'sent')));
  await opening;
  await vi.waitFor(() => expect(statuses(client)).toEqual(['delivered']));
});

it('with no load to wait for, the re-read starts now, cancelling an older read', async () => {
  const client = await opened();
  const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  rereadChat(client, PHONE);
  const filters = { queryKey: ['threads', 'detail', PHONE], type: 'active' };
  expect(refetch.mock.calls).toEqual([[filters, { cancelRefetch: true }]]);
});
