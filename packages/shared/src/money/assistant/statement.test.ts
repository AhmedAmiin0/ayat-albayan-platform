import { describe, expect, it } from 'vitest';
import { lastDayOf, monthOf, nextOpenMonth, planStatement, totalsOf, voidEffect } from './statement.js';

const SALARY = { amount: 1000, currency: 'EGP', startsOn: '2026-01-01' };
const base = { month: '2026-10-01', tz: 'Asia/Riyadh', salary: SALARY, commissions: [], adjustments: [] };

describe('planStatement', () => {
  it('is the salary alone when nothing else is open', () => {
    const p = planStatement(base);
    expect(p.lines).toEqual([{ kind: 'salary', ref: null, amount: 1000, currency: 'EGP' }]);
    expect(p.totals).toEqual({ EGP: { salary: 1000, commissions: 0, adjustments: 0, total: 1000 } });
  });

  it('adds the commissions earned up to the month, per currency, never across them', () => {
    const p = planStatement({
      ...base,
      commissions: [
        { id: 'c1', amount: 25, currency: 'SAR', earnedAt: '2026-10-05T10:00:00Z' },
        { id: 'c2', amount: 30, currency: 'EGP', earnedAt: '2026-10-07T10:00:00Z' },
        { id: 'c3', amount: 10.1, currency: 'SAR', earnedAt: '2026-10-08T10:00:00Z' },
      ],
    });
    expect(p.totals).toEqual({
      EGP: { salary: 1000, commissions: 30, adjustments: 0, total: 1030 },
      SAR: { salary: 0, commissions: 35.1, adjustments: 0, total: 35.1 },
    });
  });

  it('leaves out a commission of a later month and carries an earlier one that no statement took', () => {
    const p = planStatement({
      ...base,
      commissions: [
        { id: 'late', amount: 5, currency: 'SAR', earnedAt: '2026-11-02T10:00:00Z' },
        { id: 'old', amount: 7, currency: 'SAR', earnedAt: '2026-08-02T10:00:00Z' },
      ],
    });
    expect(p.lines.filter((l) => l.kind === 'commission').map((l) => l.ref)).toEqual(['old']);
  });

  it('buckets a commission by the day in the assistant tz (late 30 Sept UTC is already 1 Oct in Riyadh)', () => {
    const c = { id: 'c', amount: 5, currency: 'SAR', earnedAt: '2026-09-30T22:00:00Z' };
    expect(planStatement({ ...base, month: '2026-09-01', commissions: [c] }).lines).toHaveLength(1); // salary only
    expect(planStatement({ ...base, month: '2026-10-01', commissions: [c] }).lines.map((l) => l.kind)).toEqual(['salary', 'commission']);
  });

  it('applies adjustments from their effective month on, signed', () => {
    const adjustments = [
      { id: 'r', amount: -50, currency: 'SAR', effectiveMonth: '2026-10-01' },
      { id: 'later', amount: 20, currency: 'SAR', effectiveMonth: '2026-11-01' },
    ];
    const p = planStatement({ ...base, salary: null, adjustments });
    expect(p.totals).toEqual({ SAR: { salary: 0, commissions: 0, adjustments: -50, total: -50 } });
  });

  it('runs the salary only once it has started, a full month, and skips a zero salary', () => {
    expect(planStatement({ ...base, salary: { ...SALARY, startsOn: '2026-10-31' } }).lines).toHaveLength(1);
    expect(planStatement({ ...base, salary: { ...SALARY, startsOn: '2026-11-01' } }).lines).toHaveLength(0);
    expect(planStatement({ ...base, salary: { ...SALARY, amount: 0 } }).lines).toHaveLength(0);
  });

  it('is empty without terms or earnings', () => {
    expect(planStatement({ ...base, salary: null })).toEqual({ lines: [], totals: {} });
  });
});

describe('totalsOf', () => {
  it('sums in exact cents', () => {
    const lines = [0.1, 0.2, 0.3].map((amount) => ({ kind: 'commission' as const, ref: null, amount, currency: 'SAR' }));
    expect(totalsOf(lines).SAR?.total).toBe(0.6);
  });
});

describe('month helpers', () => {
  it('monthOf follows the time zone and lastDayOf knows leap years', () => {
    expect(monthOf('2026-12-31T21:30:00Z', 'Asia/Riyadh')).toBe('2027-01-01');
    expect(monthOf('2026-12-31T21:30:00Z', 'UTC')).toBe('2026-12-01');
    expect(lastDayOf('2028-02-01')).toBe('2028-02-29');
    expect(lastDayOf('2026-02-01')).toBe('2026-02-28');
    expect(lastDayOf('2026-12-01')).toBe('2026-12-31');
  });
});

describe('nextOpenMonth', () => {
  const now = '2026-10-15T10:00:00Z';
  it('is this month without a frozen statement or when it is older', () => {
    expect(nextOpenMonth({ now, tz: 'Asia/Riyadh', latestFrozenMonth: null })).toBe('2026-10-01');
    expect(nextOpenMonth({ now, tz: 'Asia/Riyadh', latestFrozenMonth: '2026-08-01' })).toBe('2026-10-01');
  });
  it('is the month after the newest approved or paid statement when that is later', () => {
    expect(nextOpenMonth({ now, tz: 'Asia/Riyadh', latestFrozenMonth: '2026-10-01' })).toBe('2026-11-01');
    expect(nextOpenMonth({ now, tz: 'Asia/Riyadh', latestFrozenMonth: '2026-12-01' })).toBe('2027-01-01');
  });
});

describe('voidEffect', () => {
  const c = { amount: 25, currency: 'SAR' };
  it('drops out of a draft or an unlinked commission without an adjustment', () => {
    expect(voidEffect(null, c, '2026-11-01')).toEqual({ adjustment: null, rebuildDraft: false });
    expect(voidEffect('draft', c, '2026-11-01')).toEqual({ adjustment: null, rebuildDraft: true });
  });
  it('leaves a frozen statement alone and reverses it in the next open month', () => {
    for (const s of ['approved', 'paid'] as const) {
      expect(voidEffect(s, c, '2026-11-01')).toEqual({
        adjustment: { amount: -25, currency: 'SAR', effectiveMonth: '2026-11-01' },
        rebuildDraft: false,
      });
    }
  });
});
