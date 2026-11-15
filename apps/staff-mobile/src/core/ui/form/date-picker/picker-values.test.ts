import { dateToDay, dateToTime, dayToDate, timeToDate } from './picker-values';

test('a day goes to the picker as its local noon and comes back the same', () => {
  const at = dayToDate('2026-03-29');
  expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours()]).toEqual([2026, 2, 29, 12]);
  expect(dateToDay(at)).toBe('2026-03-29');
  expect(dateToDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('a time goes as that clock and comes back HH:MM; none opens on noon', () => {
  expect(dateToTime(timeToDate('07:05'))).toBe('07:05');
  expect(dateToTime(timeToDate(''))).toBe('12:00');
  expect(dateToTime(new Date(2000, 0, 1, 23, 45))).toBe('23:45');
});
