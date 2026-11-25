import type { MessageView, ThreadDetail } from '@ab/shared';
import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { heldRead, msg, PHONE } from '@/features/messaging/inbox/api/patch-fixtures';
import { rereadChat } from '@/features/messaging/inbox/api/reread/reread';
import { threadQuery } from '@/features/messaging/inbox/api/thread-query';
import { threadKeys } from '@/features/messaging/inbox/api/keys';

// docs/44 K1 (#693 review): a page load started while the event's delta is out (its answer is then
// dropped) is followed by one more delta, and a deferred read never starts while the window has no
// focus (a read stamps read_at and sends Meta a read receipt).

const mockApiFetch = vi.fn();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args) as unknown,
}));

const KEY = threadQuery(PHONE).queryKey;
const page = (has_more: boolean, ...messages: MessageView[]) =>
  ({ messages, has_more }) as ThreadDetail;
const focused = (on: boolean) => vi.spyOn(document, 'hasFocus').mockReturnValue(on);

const deltas = vi.fn(async (): Promise<unknown> => 0);

async function opened() {
  const client = new QueryClient();
  mockApiFetch.mockResolvedValueOnce(page(true, msg('a', 'sent')));
  await client.infiniteQuery(threadQuery(PHONE));
  const query = client.getQueryCache().find({ queryKey: KEY, exact: true });
  if (query) vi.spyOn(query, 'isActive').mockReturnValue(true);
  const delta = { queryKey: threadKeys.delta(PHONE), queryFn: deltas, initialData: 0 };
  client.getQueryCache().build(client, delta);
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
  deltas.mockReset().mockResolvedValue(0);
  focused(true);
});

it('a page load started during the delta: one more delta after it lands', async () => {
  const { client, chat } = await opened();
  const first = heldRead<unknown>();
  deltas.mockReturnValueOnce(first.promise);
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(1));
  const p1 = await held(() => void chat.fetchNextPage()); // a click while the delta is out
  first.resolve(0);
  await new Promise((r) => setTimeout(r, 0));
  expect(deltas).toHaveBeenCalledTimes(1);
  p1.resolve(page(false, msg('b', 'sent')));
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(2));
  expect(client.getQueryData(KEY)?.pages).toHaveLength(2);
});

it('focus lost before a deferred read starts: none; with focus back the next one runs', async () => {
  const { client, chat } = await opened();
  const p1 = await held(() => void chat.fetchNextPage());
  rereadChat(client, PHONE);
  focused(false); // the agent left the window while the page loaded
  p1.resolve(page(false, msg('b', 'sent')));
  await chat.getCurrentQuery().promise;
  await new Promise((r) => setTimeout(r, 0));
  rereadChat(client, PHONE); // still no focus: nothing either
  expect(deltas).not.toHaveBeenCalled();
  focused(true);
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(1));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
});

it('a page load that already landed holds no later event back: each event reads a delta', async () => {
  const { client, chat } = await opened();
  const p1 = await held(() => void chat.fetchNextPage());
  p1.resolve(page(false, msg('b', 'sent')));
  await chat.getCurrentQuery().promise;
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(1));
  rereadChat(client, PHONE);
  await vi.waitFor(() => expect(deltas).toHaveBeenCalledTimes(2));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
});
