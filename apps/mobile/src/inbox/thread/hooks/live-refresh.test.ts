import { createTestQueryClient } from '@/test/query';
import { cachedThread, detail, inbound, PHONE } from '@/inbox/shared/thread-fixtures';
import { refreshOpenChat } from './live-refresh';
import { threadKey } from './thread-cache';

// A realtime event for the open chat (docs/43 AU5): a delta, not a whole newest page.

function setup() {
  const client = createTestQueryClient();
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const keys = () => refetch.mock.calls.map(([filters]) => filters?.queryKey);
  return { client, keys };
}

test('a chat with rows runs its delta query', () => {
  const { client, keys } = setup();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([inbound])));
  refreshOpenChat(client, PHONE);
  expect(keys()).toEqual([['thread-delta', PHONE]]);
});

test('an empty chat has nothing to anchor a delta on: its page poll re-reads instead', () => {
  const { client, keys } = setup();
  client.setQueryData(threadKey(PHONE), cachedThread(detail([])));
  refreshOpenChat(client, PHONE);
  expect(keys()).toEqual([['thread-poll', PHONE]]);
});

test('a chat not loaded yet: the page poll too', () => {
  const { client, keys } = setup();
  refreshOpenChat(client, PHONE);
  expect(keys()).toEqual([['thread-poll', PHONE]]);
});
