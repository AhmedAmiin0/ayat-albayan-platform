import { digest, goldenDates } from '@ab/shared/testing';
import { dayLabel, riyadhMidnight, riyadhNoon, weekLabel, weekWindow } from './week';

// Regression golden (docs/34 §7): GET /lessons `from`/`to` of a week, the day's noon instant and
// the labels, for every day of the sweep. Before the swap to the date-fns facade the old
// `+03:00` / Intl code ran beside the new one here and agreed on every value; the digest was
// taken from the old code.

const line = (date: string) =>
  [riyadhMidnight(date), riyadhNoon(date).toISOString(), weekWindow(date).to, dayLabel(date), weekLabel(date)].join(' | ');

test('Riyadh midnights, noons, week ends and labels, pinned', () => {
  expect(digest(goldenDates().map(line))).toBe('380:2e465a07');
});

test('the week of 2026-10-24 (Cairo changes its clocks on the 29th; Riyadh does not)', () => {
  expect(weekWindow('2026-10-24')).toEqual({ from: '2026-10-23T21:00:00.000Z', to: '2026-10-30T21:00:00.000Z' });
  expect(riyadhNoon('2026-12-31').toISOString()).toBe('2026-12-31T09:00:00.000Z');
  expect(dayLabel('2026-10-24')).toBe('السبت 24 أكتوبر');
});
