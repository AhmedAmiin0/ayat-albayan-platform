import type { ThreadDelta } from '@ab/shared';
import { createTestQueryClient } from '@/test/query';
import { cachedThread, delivered, detail, inbound, PHONE } from '@/inbox/shared/thread-fixtures';
import { noteDelta } from './delta-news';
import { refreshOpenChat } from './live-refresh';
import { threadKey } from './thread-cache';

// A realtime event for the open chat (docs/43 AU5): a delta first, the page only when it was empty.

const delta = (over: Partial<ThreadDelta> = {}): ThreadDelta => ({
  messages: [],
  has_more: false,
  pending: [],
  ...over,
});

function setup(answer: ThreadDelta | null) {
  const client = createTestQueryClient();
  const cache = cachedThread(detail([inbound, delivered]));
  const refetch = jest.spyOn(client, 'refetchQueries').mockImplementation(async (filters) => {
    if (answer && filters?.queryKey?.[0] === 'thread-delta') noteDelta(PHONE, cache, answer);
  });
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const keys = () => refetch.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
  const badges = () => invalidate.mock.calls.length;
  return { client, cache, keys, badges };
}

test('a delta that brings a changed row is all: no page, no badge', async () => {
  const t = setup(delta({ pending: [{ ...delivered, status: 'read' }] }));
  t.client.setQueryData(threadKey(PHONE), t.cache);
  await refreshOpenChat(t.client, PHONE);
  expect([t.keys(), t.badges()]).toEqual([['thread-delta'], 0]);
});

test('a delta with nothing new: the page re-reads, and the badge (an old row, a reaction)', async () => {
  const t = setup(delta({ pending: [delivered] }));
  t.client.setQueryData(threadKey(PHONE), t.cache);
  await refreshOpenChat(t.client, PHONE);
  expect([t.keys(), t.badges()]).toEqual([['thread-delta', 'thread-poll'], 1]);
});

test('a delta that never answered (busy, aborted): no extra read', async () => {
  const t = setup(null);
  t.client.setQueryData(threadKey(PHONE), t.cache);
  await refreshOpenChat(t.client, PHONE);
  expect(t.keys()).toEqual(['thread-delta']);
});

test('an empty chat (nothing to anchor a delta) or one not loaded: the page at once', async () => {
  const t = setup(delta());
  t.client.setQueryData(threadKey(PHONE), cachedThread(detail([])));
  await refreshOpenChat(t.client, PHONE);
  const u = setup(delta());
  await refreshOpenChat(u.client, PHONE);
  expect([t.keys(), u.keys()]).toEqual([['thread-poll'], ['thread-poll']]);
});
