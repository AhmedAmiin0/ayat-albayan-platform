import { t } from '@/core/lib/i18n/i18n';

// A phone in Bogotá (UTC-5) or Cairo (UTC+3 until 29 Oct 2026) still reads the academy's Riyadh
// calendar: today, the السبت week start and each label's weekday never follow the device's zone.
// jest cannot switch the process zone, so the device is emulated: a plain Date's local getters and
// Intl's default zone are that zone's, and the module is loaded after. The offset and the local
// setters stay the process's (UTC): date-fns' TZDate needs them to agree with each other.
type Week = typeof import('./week');
const GETTERS = ['FullYear', 'Month', 'Date', 'Day', 'Hours', 'Minutes'] as const;

function onDevice(zone: string, offsetMin: number): Week {
  const shifted = (d: Date) => new Date(d.getTime() + offsetMin * 60_000);
  for (const g of GETTERS) {
    const real = Date.prototype[`get${g}`];
    // Plain Dates only: date-fns' TZDate (a Date subclass) reads its own zone, not the device's.
    jest.spyOn(Date.prototype, `get${g}`).mockImplementation(function (this: Date) {
      return this.constructor === Date ? shifted(this)[`getUTC${g}`]() : real.call(this);
    });
  }
  const Real = Intl.DateTimeFormat;
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((locales, options) => new Real(locales, { timeZone: zone, ...options }));
  let week: Week | undefined;
  jest.isolateModules(() => {
    week = jest.requireActual<Week>('./week');
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
