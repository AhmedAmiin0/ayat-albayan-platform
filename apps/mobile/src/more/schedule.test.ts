import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import {
  formatTimeOff,
  gridTz,
  groupByWeekday,
  slotRange,
  tzLabel,
  upcomingTimeOff,
  weekdayName,
} from './schedule';
import type { AvailabilityRow } from '@/core/lib/staff/types';

const slot = (id: string, weekday: number, start_time: string): AvailabilityRow => ({
  id,
  weekday,
  start_time,
  end_time: '23:00',
  tz: 'Africa/Cairo',
});

test('groupByWeekday: only days with slots, الأحد first, each day by start time', () => {
  const days = groupByWeekday([slot('a', 3, '18:00'), slot('b', 1, '09:00'), slot('c', 3, '08:00')]);
  expect(days.map((d) => d.weekday)).toEqual([1, 3]);
  expect(days[1]?.slots.map((s) => s.id)).toEqual(['c', 'a']);
  expect(groupByWeekday([])).toEqual([]);
});

test('weekdayName follows enums.weekday: 0 = الأحد … 6 = السبت', () => {
  expect(weekdayName(0)).toBe(t.enums.weekday['0']);
  expect(weekdayName(6)).toBe(t.enums.weekday['6']);
  expect(weekdayName(7)).toBe('');
});

test('gridTz: the zone saved with the grid, else the teacher’s', () => {
  expect(gridTz([slot('a', 0, '09:00')], 'Asia/Riyadh')).toBe('Africa/Cairo');
  expect(gridTz([], 'Asia/Riyadh')).toBe('Asia/Riyadh');
});

test('tzLabel: Arabic names for the two academy zones, any other zone as an LTR island', () => {
  expect(tzLabel('Asia/Riyadh')).toBe(t.runningHead.riyadh);
  expect(tzLabel('Africa/Cairo')).toBe(t.runningHead.cairo);
  expect(tzLabel('Europe/London')).toBe(ltr('Europe/London'));
});

test('slotRange: the stored «HH:MM» pair as an isolated range, 24 h or 12 h', () => {
  expect(slotRange({ start_time: '16:00', end_time: '18:30' }, '24')).toBe('\u206616:00 – 18:30\u2069');
  expect(slotRange({ start_time: '16:00', end_time: '18:30' }, '12')).toBe('\u20674:00 م – 6:30 م\u2069');
});

test('upcomingTimeOff: drops what has ended, soonest first (the API sends newest first)', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const off = (id: string, starts_at: string, ends_at: string) => ({ id, starts_at, ends_at, reason: null });
  const list = [
    off('later', '2026-11-01T00:00:00Z', '2026-11-03T00:00:00Z'),
    off('ongoing', '2026-10-09T00:00:00Z', '2026-10-11T00:00:00Z'),
    off('past', '2026-09-01T00:00:00Z', '2026-09-02T00:00:00Z'),
    off('justEnded', '2026-10-10T08:00:00Z', '2026-10-10T12:00:00Z'),
  ];
  expect(upcomingTimeOff(list, now).map((o) => o.id)).toEqual(['ongoing', 'later']);
});

describe('formatTimeOff (device zone, Western digits)', () => {
  const span = (start: Date, end: Date) =>
    formatTimeOff({ starts_at: start.toISOString(), ends_at: end.toISOString() }, '24');

  test('whole days read as days, the end exclusive', () => {
    const text = span(new Date(2026, 9, 10), new Date(2026, 9, 13));
    expect(text).toMatch(/^\S+، 10 أكتوبر – \S+، 12 أكتوبر$/);
  });

  test('one whole day is just that day', () => {
    expect(span(new Date(2026, 9, 10), new Date(2026, 9, 11))).toMatch(/^\S+، 10 أكتوبر$/);
  });

  test('part of a day keeps its 24h times', () => {
    const text = span(new Date(2026, 9, 10, 9, 0), new Date(2026, 9, 10, 13, 30));
    expect(text).toContain('09:00');
    expect(text).toContain('13:30');
    expect(text).not.toMatch(/[٠-٩]/);
  });

  test('part of a day in 12 h: ص / م', () => {
    const text = formatTimeOff({ starts_at: new Date(2026, 9, 10, 9, 0).toISOString(), ends_at: new Date(2026, 9, 10, 13, 30).toISOString() }, '12');
    expect(text).toContain('9:00 ص');
    expect(text).toContain('1:30 م');
  });
});
