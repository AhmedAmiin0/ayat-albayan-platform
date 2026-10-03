import { describe, expect, it } from 'vitest';
import { allocateOldestFirst, cents, earningStatus, summarize } from './earnings.plan.js';

const e = (id: string, day: number, outstanding: number) => ({
  id,
  starts_at: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z`,
  outstanding,
});

describe('allocateOldestFirst (per-session ledger)', () => {
  it('pays the oldest session first, whatever the input order', () => {
    const r = allocateOldestFirst({ amount: 150, earnings: [e('c', 12, 90), e('a', 3, 90), e('b', 8, 90)] });
    expect(r).toEqual({
      ok: true,
      items: [
        { earning_id: 'a', amount: 90 },
        { earning_id: 'b', amount: 60 },
      ],
    });
  });

  it('allows a partial amount: the last session touched is paid in part', () => {
    const r = allocateOldestFirst({ amount: 30, earnings: [e('a', 3, 90)] });
    expect(r).toEqual({ ok: true, items: [{ earning_id: 'a', amount: 30 }] });
  });

  it('refuses more than is owed (never a credit)', () => {
    expect(allocateOldestFirst({ amount: 180.01, earnings: [e('a', 3, 90), e('b', 4, 90)] })).toEqual({
      ok: false,
      error: 'over_payment',
    });
  });

  it('pays the exact total across every session', () => {
    const r = allocateOldestFirst({ amount: 180, earnings: [e('a', 3, 90), e('b', 4, 90)] });
    expect(r.ok && r.items.map((i) => i.amount)).toEqual([90, 90]);
  });

  it('skips sessions with nothing outstanding; none open → nothing_due', () => {
    expect(allocateOldestFirst({ amount: 10, earnings: [e('a', 3, 0), e('b', 4, 50)] })).toMatchObject({
      ok: true,
      items: [{ earning_id: 'b', amount: 10 }],
    });
    expect(allocateOldestFirst({ amount: 10, earnings: [e('a', 3, 0)] })).toEqual({ ok: false, error: 'nothing_due' });
    expect(allocateOldestFirst({ amount: 10, earnings: [] })).toEqual({ ok: false, error: 'nothing_due' });
  });

  it('breaks a same-start tie by id and has no float drift (0.1 + 0.2)', () => {
    const r = allocateOldestFirst({ amount: 0.3, earnings: [e('b', 3, 0.2), e('a', 3, 0.1)] });
    expect(r).toEqual({
      ok: true,
      items: [
        { earning_id: 'a', amount: 0.1 },
        { earning_id: 'b', amount: 0.2 },
      ],
    });
    expect(cents(0.1 + 0.2)).toBe(30);
  });
});

describe('earningStatus / summarize', () => {
  it('earned → partially_paid → paid (an overpaid shrink is paid too)', () => {
    expect(earningStatus({ amount: 90, paid: 0 })).toBe('earned');
    expect(earningStatus({ amount: 90, paid: 30 })).toBe('partially_paid');
    expect(earningStatus({ amount: 90, paid: 90 })).toBe('paid');
    expect(earningStatus({ amount: 50, paid: 90 })).toBe('paid');
  });

  it('adds earned / paid / outstanding and counts open sessions', () => {
    const rows = [
      { amount: 90, paid: 90, outstanding: 0 },
      { amount: 90, paid: 30, outstanding: 60 },
      { amount: 70, paid: 0, outstanding: 70 },
    ];
    expect(summarize(rows)).toEqual({
      earned: 250,
      paid: 120,
      outstanding: 130,
      sessions: 3,
      open_sessions: 2,
      currency: 'EGP',
    });
    expect(summarize([]).outstanding).toBe(0);
  });
});
