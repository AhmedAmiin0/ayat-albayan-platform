import type { MessageView, ThreadDetail } from '@ab/shared';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { patchLiveCaches } from './live-patch';
import { heldRead, live, msg, PHONE } from './patch-fixtures';
import { rereadChat } from './reread';
import { threadQuery } from './thread-query';

// docs/44 K1: a live event never drops an older-page load in flight nor joins a first load.

const mockApiFetch = vi.fn();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
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

const deltas = vi.fn(async () => 0);

/** The open chat's delta query (thread-delta.ts): what an event reads. */
function withDelta(client: QueryClient) {
  return client.getQueryCache().build(client, { queryKey: ['thread-delta', PHONE], queryFn: deltas, initialData: 0 });
}

/** A chat open with one page that has older ones, observed (the re-read's type: 'active'). */
async function opened() {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(page(true, msg('a', 'sent')));
  await client.infiniteQuery(threadQuery(PHONE));
  observe(client);
  withDelta(client);
  return client;
}

async function pageLoad(client: QueryClient) {
  const older = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(older.promise);
  const query = client.getQueryCache().find({ queryKey: KEY, exact: true });
  const more = { meta: { fetchMore: { direction: 'forward' as const } } };
  const done = query?.fetch(undefined, more).catch(() => undefined);
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  return { resolve: older.resolve, done };
}

beforeEach(() => {
  mockApiFetch.mockReset();
  deltas.mockClear();
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
});

it('a patch during a page load moves the tick and lets the page land', async () => {
  const client = await opened();
  const older = await pageLoad(client);
  patchLiveCaches(client, PHONE, [live('a', 'delivered')]);
  expect(statuses(client)).toEqual(['delivered']);
  older.resolve(page(false, msg('zz', 'read')));
  await older.done;
  expect(client.getQueryData(KEY)?.pages).toHaveLength(2);
});

it('an event during a page load waits for it, then reads the delta once (no full read)', async () => {
  const client = await opened();
  const older = await pageLoad(client);
  rereadChat(client, PHONE);
  rereadChat(client, PHONE); // a second event: still one chained read
  expect(deltas).not.toHaveBeenCalled();
  older.resolve(page(false, msg('zz', 'sent')));
  await older.done;
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(1));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(KEY)?.pages).toHaveLength(2);
});

it('an event during the first load is not joined: the delta runs after it', async () => {
  const client = new QueryClient();
  const first = heldRead<unknown>();
  mockApiFetch.mockReturnValueOnce(first.promise);
  const opening = client.infiniteQuery(threadQuery(PHONE));
  await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
  observe(client);
  withDelta(client);
  rereadChat(client, PHONE);
  expect(deltas).not.toHaveBeenCalled();
  first.resolve(page(false, msg('a', 'sent')));
  await opening;
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(1));
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
});

it('with no load to wait for, the delta runs now, cancelling an older one in flight', async () => {
  const client = await opened();
  const delta = withDelta(client);
  const fetch = vi.spyOn(delta, 'fetch');
  rereadChat(client, PHONE);
  expect(fetch.mock.calls).toEqual([[undefined, { cancelRefetch: true }]]);
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(1));
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
});
