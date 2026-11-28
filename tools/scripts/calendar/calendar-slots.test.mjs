import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skipReason } from './calendar-slots.mjs';

const at = (time) => ({ date: '2026-09-26', time, utc: false, tz: 'Asia/Riyadh' });

test('skip reason: all-day first, then a rule that is not weekly, then an ended series', () => {
  assert.equal(skipReason({ start: at(null), rrule: { freq: 'DAILY' } }, '2026-10-03'), 'allDay');
  assert.equal(skipReason({ start: at('08:00'), rrule: { freq: 'DAILY' } }, '2026-10-03'), 'notWeekly');
  assert.equal(skipReason({ start: at('08:00'), rrule: null }, '2026-10-03'), 'ended');
});

test('skip reason: none for a weekly series still running', () => {
  const series = { start: at('08:00'), rrule: { freq: 'WEEKLY', byday: [6], until: null, count: null } };
  assert.equal(skipReason(series, '2026-10-03'), undefined);
});
