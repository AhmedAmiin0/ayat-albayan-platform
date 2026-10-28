import { t } from '@/core/lib/i18n/i18n';
import { clockAt, leadAge, pluralForm } from './format';

const NOW = new Date('2026-10-01T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const age = t.mobile.age;

test.each([
  [1, 'one'],
  [2, 'two'],
  [3, 'few'],
  [10, 'few'],
  [11, 'other'],
  [99, 'other'],
  [100, 'other'],
  [103, 'few'],
  [111, 'other'],
])('pluralForm(%i) = %s', (n, form) => {
  expect(pluralForm(n)).toBe(form);
});

test.each([
  [30_000, age.now],
  [MIN, age.minutes.one],
  [2 * MIN, age.minutes.two],
  [5 * MIN, age.minutes.few.replace('{n}', '5')],
  [59 * MIN, age.minutes.other.replace('{n}', '59')],
  [60 * MIN, age.hours.one],
  [3 * 60 * MIN, age.hours.few.replace('{n}', '3')],
  [23 * 60 * MIN, age.hours.other.replace('{n}', '23')],
  [24 * 60 * MIN, age.days.one],
  [2 * 24 * 60 * MIN, age.days.two],
  [45 * 24 * 60 * MIN, age.days.other.replace('{n}', '45')],
])('leadAge %i ms ago → %s', (ms, text) => {
  expect(leadAge(ago(ms), NOW)).toBe(text);
});

test('a clock ahead of the server never prints a negative age', () => {
  expect(leadAge(ago(-5 * MIN), NOW)).toBe(age.now);
});

test('Western digits only', () => {
  expect(leadAge(ago(5 * 24 * 60 * MIN), NOW)).toMatch(/5/);
  expect(leadAge(ago(5 * 24 * 60 * MIN), NOW)).not.toMatch(/[٠-٩]/);
});

test('clockAt is a 24h HH:mm', () => {
  expect(clockAt(NOW.getTime(), '24')).toMatch(/^\d{2}:\d{2}$/);
});

