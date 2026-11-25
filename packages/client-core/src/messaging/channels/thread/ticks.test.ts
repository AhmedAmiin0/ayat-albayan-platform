import { expect, test } from 'vitest';
import { channelMessage } from './channel.fakes.test-util';
import { pendingMessage } from './pending';
import { ticksOf } from './ticks';

test('mine: the clock while on its way, ✓ once stored, ✓✓ once everyone read it', () => {
  const at = new Date('2026-10-27T10:00:00Z');
  expect(ticksOf(pendingMessage({ body: 'x', clientId: 'c', at }))).toBe('queued');
  expect(ticksOf(channelMessage({ mine: true }))).toBe('sent');
  expect(ticksOf(channelMessage({ mine: true, read_by_all: true }))).toBe('read');
});

test('none on someone else’s message or a deleted one', () => {
  expect(ticksOf(channelMessage())).toBeNull();
  expect(ticksOf(channelMessage({ mine: true, deleted: true }))).toBeNull();
});
