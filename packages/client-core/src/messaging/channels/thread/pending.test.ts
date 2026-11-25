import type { ChannelPage } from '@ab/shared';
import { expect, test } from 'vitest';
import { channelMessage } from './channel.fakes.test-util';
import { isPending, pendingMessage, withPending, withoutPending } from './pending';

const row = pendingMessage({ body: 'شكرًا', clientId: 'c1', at: new Date('2026-10-27T10:00:00Z') });
const page = (ids: string[]): ChannelPage => ({
  ...{ student_name: 'سلمى', has_more: false, read_only: false, open: true },
  ...{ closed_reason: null, channel_id: '', participants: [], my_last_read_at: null },
  messages: ids.map((id) => channelMessage({ id })),
});
const data = () => ({ pages: [page(['m1']), page(['old'])], pageParams: [undefined, 'cursor'] });

test('the pending row is the newest message of the newest page; older pages untouched', () => {
  const next = withPending(data(), row);
  expect(next?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1', 'pending:c1']);
  expect(next?.pages[1]?.messages.map((m) => m.id)).toEqual(['old']);
  expect(next?.pageParams).toEqual([undefined, 'cursor']);
  expect(row).toMatchObject({ mine: true, client_id: 'c1', kind: 'text', body: 'شكرًا' });
});

test('a retry replaces its own row; nothing cached stays nothing', () => {
  const twice = withPending(withPending(data(), row), row);
  expect(twice?.pages[0]?.messages.filter((m) => m.id === row.id)).toHaveLength(1);
  expect(withPending(undefined, row)).toBeUndefined();
});

test('a failed send takes away only its own pending row', () => {
  const sent = withPending(withPending(data(), row), { ...row, id: 'live' });
  const next = withoutPending(sent, 'c1');
  expect(next?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1', 'live']);
  expect(next?.pages[1]?.messages.map((m) => m.id)).toEqual(['old']);
  expect(withoutPending(undefined, 'c1')).toBeUndefined();
});

test('only a pending row is pending', () => {
  expect(isPending(row)).toBe(true);
  expect(isPending(channelMessage())).toBe(false);
});
