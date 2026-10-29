import { t } from '@/core/lib/i18n/i18n';
import { dayLabel, opensDay, rowTime } from './day-label';
import { clock, deviceTimeZone } from '../hooks/message-text';

// Day separators as WhatsApp (owner 2026-10-27), in the device's zone, as `stamp` counts days.
const now = new Date('2026-10-27T09:00:00Z'); // Tuesday, 12:00 in Riyadh
const RIYADH = { now, tz: 'Asia/Riyadh' };

test('today, yesterday, then the weekday within the last 6 days', () => {
  expect(dayLabel('2026-10-27T05:00:00Z', RIYADH)).toBe(t.inbox.dayToday);
  expect(dayLabel('2026-10-26T05:00:00Z', RIYADH)).toBe(t.inbox.dayYesterday);
  expect(dayLabel('2026-10-25T05:00:00Z', RIYADH)).toBe(t.enums.weekday['0']);
  expect(dayLabel('2026-10-21T05:00:00Z', RIYADH)).toBe(t.enums.weekday['3']);
});

test('older: «29 سبتمبر», with the year only when it is not this year', () => {
  expect(dayLabel('2026-09-29T05:00:00Z', RIYADH)).toBe('29 سبتمبر');
  expect(dayLabel('2026-10-20T05:00:00Z', RIYADH)).toBe('20 أكتوبر');
  expect(dayLabel('2025-12-31T05:00:00Z', RIYADH)).toBe('31 ديسمبر 2025');
});

test('the day is the device zone’s: 22:30 UTC is already tomorrow in Riyadh, still today in UTC', () => {
  const late = '2026-10-26T22:30:00Z';
  expect(dayLabel(late, RIYADH)).toBe(t.inbox.dayToday);
  expect(dayLabel(late, { now, tz: 'UTC' })).toBe(t.inbox.dayYesterday);
  expect(dayLabel(late, { now })).toBe(dayLabel(late, { now, tz: deviceTimeZone() }));
});

test('opensDay: newest first, a row opens its day when the older row above it is another day', () => {
  const rows = [
    { created_at: '2026-10-27T06:00:00Z' },
    { created_at: '2026-10-26T22:30:00Z' }, // Riyadh: the 27th, 01:30
    { created_at: '2026-10-26T20:00:00Z' }, // Riyadh: the 26th, 23:00
  ];
  expect(rows.map((_r, i) => opensDay(rows, i, 'Asia/Riyadh'))).toEqual([false, true, true]);
  expect(rows.map((_r, i) => opensDay(rows, i, 'UTC'))).toEqual([true, false, true]);
  expect(opensDay(rows, 3, 'UTC')).toBe(false);
});

test('a chat row: the clock today, else the day as the separators word it', () => {
  expect(rowTime('2026-10-27T05:00:00Z', '24', RIYADH)).toBe(clock('2026-10-27T05:00:00Z', '24', 'Asia/Riyadh'));
  expect(rowTime('2026-10-27T05:00:00Z', '24', RIYADH)).toBe('08:00');
  expect(rowTime('2026-10-26T05:00:00Z', '24', RIYADH)).toBe(t.inbox.dayYesterday);
  expect(rowTime('2026-09-29T05:00:00Z', '24', RIYADH)).toBe('29 سبتمبر');
});
