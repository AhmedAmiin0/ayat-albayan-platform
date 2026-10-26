import { t } from '@/core/lib/i18n/i18n';
import type { AvailabilityRow } from '@/more/types';
import { lesson } from '@/today/testing/fixtures';
import { ltr } from '@/core/ui/primitives/Ltr';
import { agendaDays, availabilityLine, headerLine, teacherClock } from './agenda';

// Winter week (Cairo back on UTC+2 since 30 Oct): Saturday 31 Oct → Friday 6 Nov 2026.
const START = '2026-10-31';
const at = (id: string, startsAt: string, minutes = 45) =>
  lesson({
    id,
    starts_at: startsAt,
    ends_at: new Date(Date.parse(startsAt) + minutes * 60_000).toISOString(),
  });

test('seven days always, each with its lessons on the Riyadh calendar, earliest first', () => {
  const late = at('late', '2026-11-04T21:30:00.000Z'); // Thu 00:30 in Riyadh, Wed 23:30 in Cairo
  const wedPm = at('wed-pm', '2026-11-04T14:00:00.000Z');
  const wedAm = at('wed-am', '2026-11-04T06:00:00.000Z');
  const days = agendaDays([late, wedPm, wedAm], START);
  expect(days.map((d) => d.date)).toEqual([
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
  ]);
  expect(days[4]?.lessons.map((l) => l.id)).toEqual(['wed-am', 'wed-pm']);
  // The Cairo teacher's Wednesday-night lesson is Thursday in Riyadh, so it sits on Thursday.
  expect(days[5]?.lessons.map((l) => l.id)).toEqual(['late']);
});

test('an empty week is seven empty days; cancelled and moved lessons stay hidden', () => {
  const gone = [
    lesson({ id: 'x', status: 'cancelled_by_admin', starts_at: '2026-11-01T10:00:00.000Z' }),
    lesson({ id: 'y', status: 'rescheduled', starts_at: '2026-11-02T10:00:00.000Z' }),
  ];
  const days = agendaDays(gone, START);
  expect(days).toHaveLength(7);
  expect(days.every((d) => d.lessons.length === 0)).toBe(true);
  expect(agendaDays([], START).every((d) => d.lessons.length === 0)).toBe(true);
});

test('lessons outside the week are left out', () => {
  const next = at('next', '2026-11-06T21:00:00.000Z'); // Saturday 00:00 Riyadh: the next week
  expect(agendaDays([next], START).flatMap((d) => d.lessons)).toEqual([]);
});

test('the teacher clock shows only when it reads differently from Riyadh', () => {
  const winter = at('w', '2026-11-04T14:00:00.000Z'); // 17:00 Riyadh, 16:00 Cairo
  expect(teacherClock(winter)).toBe(t.booking.teacherClock.replace('{time}', '16:00').replace('{city}', 'القاهرة'));
  const summer = at('s', '2026-10-01T14:00:00.000Z'); // Cairo on summer time: 17:00 both
  expect(teacherClock(summer)).toBeNull();
  const riyadh = { ...winter, teacher: { ...winter.teacher, tz: 'Asia/Riyadh' } };
  expect(teacherClock(riyadh)).toBeNull();
});

test('past midnight the teacher clock names the teacher’s own day (verifier: Sat 00:30 Riyadh = Fri 23:30 Cairo)', () => {
  const late = at('late', '2026-10-30T21:30:00.000Z');
  const friday = `${t.enums.weekday['5']} 23:30`;
  expect(teacherClock(late)).toBe(t.booking.teacherClock.replace('{time}', friday).replace('{city}', 'القاهرة'));
});

/** `range` is «HH:MM-HH:MM», Cairo wall clock. */
const row = (id: string, weekday: number, range: string): AvailabilityRow => {
  const [start_time = '', end_time = ''] = range.split('-');
  return { id, weekday, start_time, end_time, tz: 'Africa/Cairo' };
};

test('a day’s availability: its weekday’s windows by start, named in the grid’s zone', () => {
  const grid = [row('b', 3, '20:00-22:00'), row('a', 3, '16:00-18:00'), row('c', 6, '10:00-12:00')];
  expect(availabilityLine(grid, '2026-11-04', 'Asia/Riyadh')).toBe(
    `متاح ${ltr('16:00 – 18:00')}، ${ltr('20:00 – 22:00')} بتوقيت القاهرة`,
  );
  expect(availabilityLine(grid, '2026-11-05', 'Asia/Riyadh')).toBeNull();
  expect(availabilityLine([], '2026-11-04', 'Asia/Riyadh')).toBeNull();
});

test('the subtitle says how old a saved list is only while its refetch fails', () => {
  const ok = { isError: false, data: [], dataUpdatedAt: 0 };
  expect(headerLine(['أ', 'ب'], ok)).toBe('أ · ب');
  expect(headerLine(['أ'], { ...ok, isError: true, data: undefined })).toBe('أ');
  expect(headerLine(['أ'], { ...ok, isError: true })).toMatch(/^أ · آخر تحديث \d{2}:\d{2}$/);
});
