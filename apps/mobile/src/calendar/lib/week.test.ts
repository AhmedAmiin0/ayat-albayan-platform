import { addDays, dayLabel, riyadhMidnight, riyadhNoon, riyadhToday, weekdayOf, weekLabel, weekStart, weekWindow } from './week';

test('calendar arithmetic crosses months and years', () => {
  expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-10-03', -7)).toBe('2026-09-26');
  expect(weekdayOf('2026-10-03')).toBe(6); // السبت
  expect(weekdayOf('2026-10-04')).toBe(0); // الأحد
});

test.each([
  ['2026-10-01', '2026-09-26'], // Thursday → the Saturday before
  ['2026-10-02', '2026-09-26'], // Friday closes the week
  ['2026-10-03', '2026-10-03'], // Saturday opens it
  ['2026-10-04', '2026-10-03'],
])('the week of %s starts on Saturday %s', (date, start) => {
  expect(weekStart(date)).toBe(start);
});

test('the week window is Riyadh midnight to Riyadh midnight, seven days, in UTC', () => {
  expect(riyadhMidnight('2026-10-03')).toBe('2026-10-02T21:00:00.000Z');
  expect(weekWindow('2026-10-03', 'Asia/Riyadh')).toEqual({
    from: '2026-10-02T21:00:00.000Z',
    to: '2026-10-09T21:00:00.000Z',
  });
});

test('today is the Riyadh day: 22:00 UTC is already tomorrow there', () => {
  expect(riyadhToday(new Date('2026-10-01T20:59:00Z'))).toBe('2026-10-01');
  expect(riyadhToday(new Date('2026-10-01T21:00:00Z'))).toBe('2026-10-02');
  expect(riyadhToday(riyadhNoon('2026-10-05'))).toBe('2026-10-05');
});

test('Arabic labels with Western digits: the day and the week range', () => {
  expect(dayLabel('2026-10-03')).toBe('السبت 3 أكتوبر');
  expect(weekLabel('2026-09-26')).toBe('26 سبتمبر – 2 أكتوبر');
});
