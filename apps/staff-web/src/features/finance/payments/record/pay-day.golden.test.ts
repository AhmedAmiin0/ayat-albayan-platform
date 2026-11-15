import { digest, goldenDates, goldenInstants } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { paidAtFor } from '@/features/finance/payments/api';
import { paidAtDay } from './pay-day';

// Regression golden (docs/34 §7). Before riyadhToday / wallInstant replaced toLocaleDateString
// ('en-CA', Riyadh) and the «T12:00:00+03:00» noon, both ran side by side over this sweep and
// agreed; the digest was taken from the old code. Payment days are Riyadh days (docs/34 b).

const instants = goldenInstants(15);
const days = [...goldenDates(), '2026-02-30'];
const NOW = new Date('2026-10-29T21:30:00Z');

describe('pay day, pinned', () => {
  it('today in Riyadh every quarter hour; the instant stored for each day', () => {
    const lines = [
      ...instants.map((at) => paidAtDay(at)),
      ...days.map((day) => paidAtFor(day, NOW)),
      ...instants.filter((_, i) => i % 7 === 0).map((at) => paidAtFor('2026-10-30', at)),
    ];
    expect(digest(lines)).toBe('42073:980aaf45');
  });

  it('Riyadh midnight: 20:59Z is still the day before, 21:00Z the next', () => {
    expect(paidAtDay(new Date('2026-10-29T20:59:00Z'))).toBe('2026-10-29');
    expect(paidAtDay(new Date('2026-10-29T21:00:00Z'))).toBe('2026-10-30');
  });

  it('an earlier day is stored at its Riyadh noon; today keeps now', () => {
    expect(paidAtFor('2026-10-28', NOW)).toBe('2026-10-28T09:00:00.000Z');
    expect(paidAtFor('2026-10-30', NOW)).toBe(NOW.toISOString());
  });
});
