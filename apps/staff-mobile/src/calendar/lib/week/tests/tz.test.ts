import { t } from '@ab/mobile-kit';
import type * as WeekModule from '@/calendar/lib/week/week';

// The device zone never moves the Riyadh calendar; jest emulates the zone since it can't switch it.
type Week = typeof WeekModule;
const GETTERS = ['FullYear', 'Month', 'Date', 'Day', 'Hours', 'Minutes'] as const;

function onDevice(zone: string, offsetMin: number): Week {
  const shifted = (d: Date) => new Date(d.getTime() + offsetMin * 60_000);
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-offsetMin);
  for (const g of GETTERS) {
    jest.spyOn(Date.prototype, `get${g}`).mockImplementation(function (this: Date) {
      return shifted(this)[`getUTC${g}`]();
    });
  }
  const Real = Intl.DateTimeFormat;
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((locales, options) => new Real(locales, { timeZone: zone, ...options }));
  let week: Week | undefined;
  jest.isolateModules(() => {
    week = jest.requireActual<Week>('@/calendar/lib/week/week');
  });
  if (!week) throw new Error('week did not load');
  return week;
}

afterEach(() => jest.restoreAllMocks());

// 00:30 on Tue 27 Oct in Riyadh; still Mon 26 Oct 16:30 in Bogotá, 00:30 Tue in Cairo.
const AFTER_MIDNIGHT = new Date('2026-10-26T21:30:00Z');

test.each([
  ['America/Bogota', -300, 26],
  ['Africa/Cairo', 180, 27],
])('on a device in %s today, the week start and the labels are Riyadh’s', (zone, offset, deviceDay) => {
  const { dayLabel, riyadhToday, weekdayOf, weekLabel, weekStart } = onDevice(zone, offset);
  expect(AFTER_MIDNIGHT.getDate()).toBe(deviceDay);
  expect(new Intl.DateTimeFormat('en-US').resolvedOptions().timeZone).toBe(zone);
  const today = riyadhToday(AFTER_MIDNIGHT);
  expect(today).toBe('2026-10-27');
  const start = weekStart(today);
  expect(start).toBe('2026-10-24');
  expect(weekdayOf(start)).toBe(6);
  expect(dayLabel(start)).toBe(`${t.enums.weekday['6']} 24 أكتوبر`);
  expect(dayLabel(today)).toBe(`${t.enums.weekday['2']} 27 أكتوبر`);
  expect(weekLabel(start)).toContain('30 أكتوبر');
});
