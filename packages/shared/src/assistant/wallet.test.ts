import { describe, expect, it } from 'vitest';
import { walletState, walletTotals, type WalletEarning, type WalletLine } from './wallet.js';

const AT = { month: '2026-10-01', tz: 'Asia/Riyadh' };
const line = (amount: number, over: Partial<WalletLine> = {}): WalletLine => ({ amount, currency: 'EGP', statement: null, ...over });
const earning = (amount: number, over: Partial<WalletEarning> = {}): WalletEarning => ({
  amount, currency: 'EGP', earned_at: '2026-10-05T10:00:00Z', ...over,
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
    expect(walletTotals([], [], AT)).toEqual({});
  });

  it('per currency in exact cents, never summed across currencies', () => {
    const lines = [line(0.1), line(0.2), line(50, { currency: 'SAR' })];
    const out = walletTotals(lines, [earning(0.1), earning(0.2), earning(50, { currency: 'SAR' })], AT);
    expect(out).toEqual({ EGP: { due: 0.3, paid: 0, this_month: 0.3 }, SAR: { due: 50, paid: 0, this_month: 50 } });
  });

  it('owed = not on a paid statement (none, draft or approved); paid = on a paid one', () => {
    const lines = [
      line(10),
      line(20, { statement: { status: 'draft' } }),
      line(30, { statement: { status: 'approved' } }),
      line(40, { statement: { status: 'paid' } }),
    ];
    expect(walletTotals(lines, [], AT)['EGP']).toEqual({ due: 60, paid: 40, this_month: 0 });
  });

  it('voided inside an approved statement: its line and the reversal net to 0 owed', () => {
    const lines = [line(50, { statement: { status: 'approved' } }), line(-50)];
    expect(walletTotals(lines, [], AT)).toEqual({ EGP: { due: 0, paid: 0, this_month: 0 } });
  });

  it('voided after it was paid: paid stays 50, owed is -50 until the next statement takes it back', () => {
    const paidLine = line(50, { statement: { status: 'paid' } });
    expect(walletTotals([paidLine, line(-50)], [], AT)['EGP']).toEqual({ due: -50, paid: 50, this_month: 0 });
    expect(walletTotals([paidLine, line(-50, { statement: { status: 'paid' } })], [], AT)['EGP']).toEqual({ due: 0, paid: 0, this_month: 0 });
  });

  it('this month: every earned commission, in a statement or not, in the assistant time zone', () => {
    const late = earning(7, { earned_at: '2026-10-31T22:30:00Z' });
    expect(walletTotals([], [late], AT)).toEqual({});
    expect(walletTotals([], [late], { month: '2026-11-01', tz: 'Asia/Riyadh' })['EGP']?.this_month).toBe(7);
    expect(walletTotals([], [late], { month: '2026-10-01', tz: 'UTC' })['EGP']?.this_month).toBe(7);
  });

  it('an earlier month counts as owed or paid, not this month', () => {
    const out = walletTotals([line(9)], [earning(9, { earned_at: '2026-09-20T10:00:00Z' })], AT);
    expect(out['EGP']).toEqual({ due: 9, paid: 0, this_month: 0 });
  });
});
