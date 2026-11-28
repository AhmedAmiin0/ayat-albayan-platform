import { describe, expect, it } from 'vitest';
import { PAYOUT } from '@/features/finance/subscriptions/money-fixture';
import { currentMonth } from '@/features/finance/payouts/api';
import { monthLabel, monthOptions } from '@/features/finance/payouts/shared/MonthSelect';
import { breakdownLines } from '@/features/finance/payouts/list/payout-columns';

describe('payout helpers', () => {
  it('breakdown lines with a missing rate read 0', () => {
    const p = {
      ...PAYOUT,
      breakdown: {
        ...PAYOUT.breakdown,
        lines: [{ duration: 30 as const, lessons: 2, rate: null, amount: 0 }],
      },
    };
    expect(breakdownLines(p)).toEqual(['30 دقيقة: 2 × 0 = 0 ج.م']);
  });

  it('this month in Riyadh', () => {
    expect(currentMonth(new Date('2026-09-30T22:00:00Z'))).toBe('2026-10');
  });

  it('month options: newest first across the year boundary, an older value kept', () => {
    expect(monthOptions('2026-02', { count: 3, value: '2026-01' })).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
    ]);
    expect(monthOptions('2026-02', { count: 2, value: '2024-05' })).toEqual([
      '2026-02',
      '2026-01',
      '2024-05',
    ]);
    expect(monthLabel('2026-10')).toBe('أكتوبر 2026');
  });

});
