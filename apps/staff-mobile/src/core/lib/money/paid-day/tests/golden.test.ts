import { digest, goldenInstants } from '@ab/shared/testing';
import { paidAtFor } from '@/core/lib/money/paid-day/paid-day';

// docs/34 §7: the digest is the old Riyadh-day code's, which agreed with the new on every value.

const DAYS_AGO = [0, 1, 2, 3, 6, 7, 30];

test('paid_at for every picked day, pinned', () => {
  const paidAts = (at: Date) => DAYS_AGO.map((n) => paidAtFor(at, n).toISOString());
  const lines = goldenInstants(60).flatMap(paidAts);
  expect(digest(lines)).toBe('63840:2a93ad50');
});

test('just after Riyadh midnight, «أمس» is the Riyadh day before, at its noon (09:00Z)', () => {
  expect(paidAtFor(new Date('2026-10-29T21:30:00Z'), 1).toISOString()).toBe('2026-10-29T09:00:00.000Z');
  expect(paidAtFor(new Date('2027-01-01T00:00:00Z'), 1).toISOString()).toBe('2026-12-31T09:00:00.000Z');
});
