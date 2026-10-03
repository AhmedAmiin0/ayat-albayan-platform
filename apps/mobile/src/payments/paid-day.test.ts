import { t } from '@/lib/i18n';
import { paidAtFor, paidDayLabel } from './paid-day';

// Thursday 1 Oct 2026, 00:20 in Riyadh (still 30 Sep in UTC).
const now = new Date('2026-09-30T21:20:00Z');

test('today is now; earlier days are 12:00 Riyadh of that Riyadh day', () => {
  expect(paidAtFor(now, 0)).toBe(now);
  expect(paidAtFor(now, 1).toISOString()).toBe('2026-09-30T09:00:00.000Z');
  expect(paidAtFor(now, 7).toISOString()).toBe('2026-09-24T09:00:00.000Z');
});

test('a picked day is never after now', () => {
  for (const days of [0, 1, 2, 30]) expect(paidAtFor(now, days).getTime()).toBeLessThanOrEqual(now.getTime());
});

test('labels: اليوم and أمس first, then the date alone', () => {
  expect(paidDayLabel(now, 0)).toBe(`${t.mobile.today} · الخميس 1 أكتوبر 2026`);
  expect(paidDayLabel(now, 1)).toBe(`${t.payments.mobile.yesterday} · الأربعاء 30 سبتمبر 2026`);
  expect(paidDayLabel(now, 2)).toBe('الثلاثاء 29 سبتمبر 2026');
});
