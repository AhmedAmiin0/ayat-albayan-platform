import { describe, expect, it } from 'vitest';
import { allocatePayment, balanceOf, earningStatus, outstanding } from './earnings.js';

/** `[amount, paid?]` of one session on 2026-09-`day`. */
const e = (id: string, day: number, [amount = 0, paid = 0]: number[]) => ({
  id,
  starts_at: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z`,
  amount,
  paid_amount: paid,
});

describe('outstanding / earningStatus', () => {
  it('owed, partly paid, paid', () => {
    expect(outstanding(e('a', 1, [70]))).toBe(70);
    expect(outstanding(e('a', 1, [70, 20.5]))).toBe(49.5);
    expect(outstanding(e('a', 1, [70, 70]))).toBe(0);
    expect(earningStatus(e('a', 1, [70]))).toBe('earned');
    expect(earningStatus(e('a', 1, [70, 0.1]))).toBe('partially_paid');
    expect(earningStatus(e('a', 1, [70, 70]))).toBe('paid');
  });

  it('a session corrected below what was paid is paid with nothing outstanding', () => {
    expect(outstanding(e('a', 1, [50, 70]))).toBe(0);
    expect(earningStatus(e('a', 1, [50, 70]))).toBe('paid');
  });

  it('does not drift on decimals (0.1 + 0.2)', () => {
    expect(outstanding({ amount: 0.3, paid_amount: 0.1 + 0.2 })).toBe(0);
  });
});

describe('balanceOf', () => {
  it('earned, paid, outstanding and the count of sessions still owed', () => {
    const b = balanceOf([e('a', 1, [70, 70]), e('b', 2, [90, 30]), e('c', 3, [50])]);
    expect(b).toEqual({ earned: 210, paid: 100, outstanding: 110, overpaid: 0, sessions: 3, unpaid_sessions: 2 });
  });

  it('an overpaid session is reported apart and not netted against another', () => {
    const b = balanceOf([e('a', 1, [50, 70]), e('b', 2, [90])]);
    expect(b).toMatchObject({ outstanding: 90, overpaid: 20, paid: 70, earned: 140 });
  });

  it('no sessions → zeros', () => {
    expect(balanceOf([])).toEqual({ earned: 0, paid: 0, outstanding: 0, overpaid: 0, sessions: 0, unpaid_sessions: 0 });
  });
});

describe('allocatePayment', () => {
  const rows = [e('c', 3, [50]), e('a', 1, [70]), e('b', 2, [90, 30])];

  it('oldest lesson first, whatever the order given', () => {
    expect(allocatePayment({ amount: 130, earnings: rows })).toEqual({
      ok: true,
      items: [
        { earning_id: 'a', amount: 70 },
        { earning_id: 'b', amount: 60 },
      ],
    });
  });

  it('a partial amount stops inside a session and leaves the newest untouched', () => {
    expect(allocatePayment({ amount: 100, earnings: rows })).toEqual({
      ok: true,
      items: [
        { earning_id: 'a', amount: 70 },
        { earning_id: 'b', amount: 30 },
      ],
    });
  });

  it('the exact total pays everything; one piaster more is an overpayment', () => {
    const all = allocatePayment({ amount: 180, earnings: rows });
    expect(all.ok && all.items.map((i) => i.earning_id)).toEqual(['a', 'b', 'c']);
    expect(allocatePayment({ amount: 180.01, earnings: rows })).toEqual({ ok: false, error: 'overpayment' });
  });

  it('same start: ties go by id; paid sessions are skipped', () => {
    const tie = [e('z', 1, [10]), e('y', 1, [10]), e('x', 1, [10, 10])];
    const r = allocatePayment({ amount: 15, earnings: tie });
    expect(r).toEqual({ ok: true, items: [{ earning_id: 'y', amount: 10 }, { earning_id: 'z', amount: 5 }] });
  });

  it('refuses a non-positive amount and sessions with nothing outstanding', () => {
    expect(allocatePayment({ amount: 0, earnings: rows })).toEqual({ ok: false, error: 'invalid_amount' });
    expect(allocatePayment({ amount: -5, earnings: rows })).toEqual({ ok: false, error: 'invalid_amount' });
    expect(allocatePayment({ amount: Number.NaN, earnings: rows })).toEqual({ ok: false, error: 'invalid_amount' });
    expect(allocatePayment({ amount: 10, earnings: [e('a', 1, [70, 70])] })).toEqual({ ok: false, error: 'nothing_outstanding' });
    expect(allocatePayment({ amount: 10, earnings: [] })).toEqual({ ok: false, error: 'nothing_outstanding' });
  });

  it('decimals add up to the cent', () => {
    const r = allocatePayment({ amount: 0.3, earnings: [e('a', 1, [0.1]), e('b', 2, [0.2])] });
    expect(r).toEqual({ ok: true, items: [{ earning_id: 'a', amount: 0.1 }, { earning_id: 'b', amount: 0.2 }] });
  });
});
