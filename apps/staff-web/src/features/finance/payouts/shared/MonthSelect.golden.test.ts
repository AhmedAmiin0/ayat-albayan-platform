import { digest, goldenDates, goldenInstants } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { currentMonth } from '@/features/finance/payouts';
import { ledgerMonthRange } from '@/features/people/assistants/api';
import { previousMonth } from '@/features/reporting/dashboard/DashboardPage';
import { defaultPeriod } from '@/features/reporting/dashboard/search';
import { monthLabel as dashboardMonth } from '@/features/reporting/dashboard/shared/format';
import { monthLabel, monthOptions } from './MonthSelect';

// Regression golden (docs/34 §7) for the web's month math: the payroll month picker, the
// dashboard's default period and «previous month», and the assistants ledger month. Before
// addCalendarMonths / monthRangeIn / dateText replaced Date.UTC and Intl here, both ran side by
// side over these inputs and agreed; the digest was taken from the old code.

const months = Array.from({ length: 12 * 12 }, (_, i) => {
  const month = String((i % 12) + 1).padStart(2, '0');
  return `${2020 + Math.floor(i / 12)}-${month}`;
});

function monthLines(): string[] {
  return months.map((m) => {
    const options = monthOptions(m, { count: 24, value: '2019-01' }).join(',');
    return [monthLabel(m), dashboardMonth(m), JSON.stringify(ledgerMonthRange(m)), options].join(' ');
  });
}

const dayLines = (): string[] =>
  goldenDates().map((d) => `${JSON.stringify(defaultPeriod(d))} ${previousMonth(d)}`);

describe('months, pinned', () => {
  it('labels, options, ranges, periods and the Riyadh month every quarter hour', () => {
    const lines = [
      ...monthLines(),
      JSON.stringify(ledgerMonthRange('')),
      ...dayLines(),
      ...goldenInstants(15).map((at) => currentMonth(at)),
    ];
    expect(digest(lines)).toBe('37005:d8db249d');
  });

  it('year edges', () => {
    expect(monthOptions('2026-02', { count: 3, value: '2026-02' })).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
    ]);
    expect(ledgerMonthRange('2026-12')).toEqual({
      from: '2026-12-01T00:00:00.000Z',
      to: '2027-01-01T00:00:00.000Z',
    });
    expect(currentMonth(new Date('2026-10-31T21:00:00Z'))).toBe('2026-11');
  });
});
