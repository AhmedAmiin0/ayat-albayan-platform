import { describe, expect, it } from 'vitest';
import { walletState, walletTotals, type WalletLine } from './wallet.js';

const AT = { month: '2026-10-01', tz: 'Asia/Riyadh' };
const earned = (amount: number, over: Partial<WalletLine> = {}): WalletLine => ({
  amount, currency: 'EGP', statement: null, earned_at: '2026-10-05T10:00:00Z', ...over,
});

describe('walletState', () => {
  it('no statement or a draft: owed; approved: in a statement; paid: paid', () => {
    expect(walletState('earned', null)).toBe('due');
    expect(walletState('earned', 'draft')).toBe('due');
    expect(walletState('earned', 'approved')).toBe('in_statement');
    expect(walletState('earned', 'paid')).toBe('paid');
  });

  it('voided wins over any statement', () => {
    for (const s of [null, 'draft', 'approved', 'paid'] as const) expect(walletState('voided', s)).toBe('voided');
  });
});

describe('walletTotals', () => {
  it('nothing yet: no currency at all', () => {
    expect(walletTotals([], AT)).toEqual({});
  });

  it('per currency in exact cents, never summed across currencies', () => {
    const out = walletTotals([earned(0.1), earned(0.2), earned(50, { currency: 'SAR' })], AT);
    expect(out).toEqual({ EGP: { due: 0.3, paid: 0, this_month: 0.3 }, SAR: { due: 50, paid: 0, this_month: 50 } });
  });

  it('owed = not on a paid statement (none, draft or approved); paid = on a paid one', () => {
    const lines = [
      earned(10),
      earned(20, { statement: { status: 'draft' } }),
      earned(30, { statement: { status: 'approved' } }),
      earned(40, { statement: { status: 'paid' } }),
    ];
    expect(walletTotals(lines, AT)['EGP']).toMatchObject({ due: 60, paid: 40 });
  });

  it('voided inside an approved statement: the row and its reversal net to 0 owed', () => {
    const lines = [
      earned(50, { statement: { status: 'approved' }, earned_at: null }),
      earned(-50, { earned_at: null }),
    ];
    expect(walletTotals(lines, AT)).toEqual({ EGP: { due: 0, paid: 0, this_month: 0 } });
  });

  it('voided after it was paid: paid stays 50, owed is -50 until the next statement takes it back', () => {
    const lines = [earned(50, { statement: { status: 'paid' }, earned_at: null }), earned(-50, { earned_at: null })];
    expect(walletTotals(lines, AT)['EGP']).toEqual({ due: -50, paid: 50, this_month: 0 });
    const settled = [lines[0] as WalletLine, earned(-50, { statement: { status: 'paid' }, earned_at: null })];
    expect(walletTotals(settled, AT)['EGP']).toEqual({ due: 0, paid: 0, this_month: 0 });
  });

  it('this month follows the assistant time zone: 22:30 UTC on 31 October is already November in Riyadh', () => {
    const late = earned(7, { earned_at: '2026-10-31T22:30:00Z' });
    expect(walletTotals([late], AT)['EGP']?.this_month).toBe(0);
    expect(walletTotals([late], { month: '2026-11-01', tz: 'Asia/Riyadh' })['EGP']?.this_month).toBe(7);
    expect(walletTotals([late], { month: '2026-10-01', tz: 'UTC' })['EGP']?.this_month).toBe(7);
  });

  it('an earlier month counts as owed or paid, not this month', () => {
    expect(walletTotals([earned(9, { earned_at: '2026-09-20T10:00:00Z' })], AT)['EGP']).toEqual({ due: 9, paid: 0, this_month: 0 });
  });
});
