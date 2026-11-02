import { describe, expect, it } from 'vitest';
import { agingBucket, daysSince, receivablesOf, receivableTotals, type ReceivableIn } from './receivables.js';

const sub = (id: string, extra: Partial<ReceivableIn> = {}): ReceivableIn => ({
  id,
  student: { id: `s-${id}`, code: 'AB-0001', name: `طالب ${id}` },
  guardian: null,
  price: 450,
  currency: 'SAR',
  starts_on: '2026-09-01',
  status: 'unpaid',
  ...extra,
});

describe('aging (0–30 / 31–60 / 61–90 / 90+)', () => {
  it.each([
    [0, '0_30'],
    [30, '0_30'],
    [31, '31_60'],
    [60, '31_60'],
    [61, '61_90'],
    [90, '61_90'],
    [91, '90_plus'],
  ] as const)('%i days → %s', (days, bucket) => {
    expect(agingBucket(days)).toBe(bucket);
  });

  it('days since the package started, never negative', () => {
    expect(daysSince('2026-09-01', '2026-10-05')).toBe(34);
    expect(daysSince('2026-11-01', '2026-10-05')).toBe(0);
  });
});

describe('receivablesOf / receivableTotals', () => {
  const paid = new Map([
    ['a', 150],
    ['b', 450],
    ['c', 0],
  ]);
  const rows = receivablesOf({
    subs: [sub('a'), sub('b'), sub('c', { starts_on: '2026-06-01', currency: 'EGP', price: 3000 })],
    paid,
    today: '2026-10-05',
  });

  it('keeps only packages that still owe, the oldest debt first', () => {
    expect(rows.map((r) => [r.id, r.owed, r.days_overdue, r.bucket])).toEqual([
      ['c', 3000, 126, '90_plus'],
      ['a', 300, 34, '31_60'],
    ]);
  });

  it('totals per currency with the buckets', () => {
    expect(receivableTotals(rows)).toEqual([
      { currency: 'EGP', owed: 3000, buckets: { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 3000 } },
      { currency: 'SAR', owed: 300, buckets: { '0_30': 0, '31_60': 300, '61_90': 0, '90_plus': 0 } },
    ]);
  });
});
