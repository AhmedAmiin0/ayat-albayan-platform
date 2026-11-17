import { channelMessage, channelPage } from '../testing/channel-fixtures';
import { withPending } from './optimistic';
import { pendingMessage } from './pending';

const row = pendingMessage({ body: 'شكرًا', clientId: 'c1', at: new Date('2026-10-27T10:00:00Z') });
const data = (messages = [channelMessage()]) => ({
  pages: [channelPage({ messages }), channelPage({ messages: [channelMessage({ id: 'old' })] })],
  pageParams: [undefined, 'cursor'],
});

test('the pending row is the newest message of the newest page; older pages untouched', () => {
  const next = withPending(data(), row);
  expect(next?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1', 'pending:c1']);
  expect(next?.pages[1]?.messages.map((m) => m.id)).toEqual(['old']);
  expect(row).toMatchObject({ mine: true, client_id: 'c1', kind: 'text', body: 'شكرًا' });
});

test('a retry replaces its own row; nothing cached stays nothing', () => {
  const twice = withPending(withPending(data(), row), row);
  expect(twice?.pages[0]?.messages.filter((m) => m.id === row.id)).toHaveLength(1);
  expect(withPending(undefined, row)).toBeUndefined();
});
