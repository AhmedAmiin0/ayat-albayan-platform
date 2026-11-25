import { expect, test } from 'vitest';
import { channelMessage } from './channel.fakes.test-util';
import { channelRows, unreadBand } from './rows';

const at = (id: string, created_at: string, mine = false) =>
  channelMessage({ id, created_at, mine });
const messages = [
  at('a', '2026-10-26T10:00:00.000Z'),
  at('b', '2026-10-27T09:00:00.000Z', true),
  at('c', '2026-10-27T10:00:00.000Z'),
  at('d', '2026-10-27T11:00:00.000Z'),
];
const day = (iso: string) => iso.slice(0, 10);

test('newest first; a chip over each day’s first message; the band at the first unread', () => {
  const band = { id: 'c', count: 2 };
  const rows = channelRows({ messages, dayKey: day, dayText: day, band, more: false });
  expect(rows.map((r) => r.message.id)).toEqual(['d', 'c', 'b', 'a']);
  expect(rows.map((r) => r.opensDay)).toEqual([false, false, true, true]);
  expect(rows.map((r) => r.unread)).toEqual([null, 2, null, null]);
});

test('older pages exist: the oldest loaded row shows no chip', () => {
  const rows = channelRows({ messages, dayKey: day, dayText: day, band: null, more: true });
  expect(rows.at(-1)?.opensDay).toBe(false);
});

test('the band: everyone else’s messages after the mark; none without a mark', () => {
  expect(unreadBand(messages, '2026-10-27T08:00:00.000Z')).toEqual({ id: 'c', count: 2 });
  expect(unreadBand(messages, '2026-10-27T11:00:00.000Z')).toBeNull();
  expect(unreadBand(messages, null)).toBeNull();
});

test('the rhythm: 4pt on the same side, 8pt on a change, 0 under a chip; a follow-up', () => {
  const same = { sender_name: 'فاطمة', sender_role: 'teacher' as const };
  const thread = [
    channelMessage({ id: 'a', created_at: '2026-10-27T09:00:00.000Z', ...same }),
    channelMessage({ id: 'b', created_at: '2026-10-27T09:01:00.000Z', ...same }),
    channelMessage({ id: 'c', created_at: '2026-10-27T09:02:00.000Z', mine: true }),
    channelMessage({ id: 'd', created_at: '2026-10-27T09:03:00.000Z', mine: true }),
  ];
  const band = { id: 'd', count: 1 };
  const rows = channelRows({ messages: thread, dayKey: day, dayText: day, band, more: false });
  expect(rows.map((r) => [r.message.id, r.space, r.followUp])).toEqual([
    ['d', 4, false],
    ['c', 8, false],
    ['b', 4, true],
    ['a', 0, false],
  ]);
});

test('the band compares to the microsecond: a message 0.5 ms after the mark is unread', () => {
  const late = [at('x', '2026-10-27T10:00:00.123900Z')];
  expect(unreadBand(late, '2026-10-27T10:00:00.123400Z')).toEqual({ id: 'x', count: 1 });
  expect(unreadBand(late, '2026-10-27T10:00:00.123900Z')).toBeNull();
});
