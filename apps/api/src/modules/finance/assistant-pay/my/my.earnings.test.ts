import type { AssistantStatementView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { buildEarnings, commissionsTotal } from './my.earnings';
import type { MyAdjustment, MyWalletCommission } from './my.queries';

const NOW = '2026-10-15T10:00:00Z';
const TERMS = {
  assistant_id: 'a1',
  commission: { type: 'percent' as const, value: 10, currency: null, starts_on: '2026-10-01' },
  salary: { amount: 1000, currency: 'SAR', starts_on: '2026-10-01' },
  renewal_share_percent: 50,
};
const commission = (id: string, amount: number, over: object = {}) => ({ id, amount, currency: 'SAR', earned_at: '2026-10-05T10:00:00Z', statement: null, ...over });
const statement = (over: Partial<AssistantStatementView> = {}): AssistantStatementView => ({
  id: 's1', assistant: { id: 'a1', name: 'الزهراء' }, month: '2026-09-01', status: 'paid',
  totals: { SAR: { salary: 1000, commissions: 0, adjustments: 0, total: 1000 } },
  lines: [], approved_at: null, paid_at: null, method: null, note: null, has_receipt: false, ...over,
});
const base = { now: NOW, tz: 'Asia/Riyadh', terms: TERMS, commissions: [], wallet: [], adjustments: [], statements: [] };

describe('commissionsTotal', () => {
  it('sums per currency in exact cents and never across currencies', () => {
    const rows = [{ amount: 0.1, currency: 'SAR' }, { amount: 0.2, currency: 'SAR' }, { amount: 50, currency: 'EGP' }];
    expect(commissionsTotal(rows)).toEqual({ SAR: 0.3, EGP: 50 });
    expect(commissionsTotal([])).toEqual({});
  });
});

describe('buildEarnings: this month so far', () => {
  it('the salary plus the commissions not yet in a frozen statement, per currency', () => {
    const out = buildEarnings({ ...base, commissions: [commission('c1', 29), commission('c2', 10, { currency: 'EGP' })] });
    expect(out.this_month).toEqual({
      SAR: { salary: 1000, commissions: 29, adjustments: 0, total: 1029 },
      EGP: { salary: 0, commissions: 10, adjustments: 0, total: 10 },
    });
    expect(out.commissions_total).toEqual({ SAR: 29, EGP: 10 });
    expect(out.terms).toBe(TERMS);
  });

  it('a commission already inside an approved or paid statement is not counted again; a draft one still is', () => {
    const out = buildEarnings({ ...base, commissions: [commission('c1', 29, { statement: { status: 'paid' } }), commission('c2', 5, { statement: { status: 'draft' } })] });
    expect(out.this_month['SAR']?.commissions).toBe(5);
    expect(out.commissions_total).toEqual({ SAR: 34 });
  });

  it('an open negative adjustment lowers it; a frozen one does not', () => {
    const adj = (id: string, statement: MyAdjustment['statement']) => ({ id, kind: 'manual', amount: -4, currency: 'SAR', effective_month: '2026-10-01', statement });
    const out = buildEarnings({ ...base, adjustments: [adj('x', null), adj('y', { status: 'approved' })] });
    expect(out.this_month['SAR']).toMatchObject({ adjustments: -4, total: 996 });
  });

  it('no salary before its start day; terms not set at all: nothing but the commissions', () => {
    const late = { ...TERMS, salary: { amount: 1000, currency: 'SAR', starts_on: '2026-11-01' } };
    expect(buildEarnings({ ...base, terms: late }).this_month).toEqual({});
    expect(buildEarnings({ ...base, terms: null, commissions: [commission('c1', 7)] }).this_month['SAR']).toMatchObject({ salary: 0, commissions: 7 });
  });

  it('months follow the assistant time zone: earned 21:30 UTC on the 31st is already the 1st in Riyadh, so next month', () => {
    const late = commission('c1', 3, { earned_at: '2026-10-31T21:30:00Z' });
    expect(buildEarnings({ ...base, now: '2026-10-31T10:00:00Z', commissions: [late] }).this_month['SAR']?.commissions).toBe(0);
    expect(buildEarnings({ ...base, now: '2026-10-31T10:00:00Z', tz: 'UTC', commissions: [late] }).this_month['SAR']?.commissions).toBe(3);
  });

  it('the month already has an approved or paid statement: its frozen totals, not a second salary', () => {
    const frozen = statement({ month: '2026-10-01', totals: { SAR: { salary: 1000, commissions: 29, adjustments: 0, total: 1029 } } });
    const out = buildEarnings({ ...base, commissions: [commission('c1', 29, { statement: { status: 'approved' } })], statements: [frozen, statement()] });
    expect(out.this_month).toEqual(frozen.totals);
    expect(out.statements.map((s) => s.month)).toEqual(['2026-10-01', '2026-09-01']);
  });
});

describe('buildEarnings: «محفظتي» (owner 2026-10-29)', () => {
  const row = (amount: number, over: Partial<MyWalletCommission> = {}): MyWalletCommission =>
    ({ amount, currency: 'EGP', earned_at: '2026-10-05T10:00:00Z', status: 'earned', statement: null, ...over });
  const reversal = (statement: MyAdjustment['statement']): MyAdjustment =>
    ({ id: 'r1', kind: 'reversal', amount: -50, currency: 'EGP', effective_month: '2026-11-01', statement });

  it('owed, paid and this month per currency from the wallet rows; the admin’s own adjustments stay out', () => {
    const wallet = [row(50), row(30, { statement: { status: 'paid' }, earned_at: '2026-09-05T10:00:00Z' })];
    const bonus = { id: 'b1', kind: 'manual', amount: 100, currency: 'EGP', effective_month: '2026-10-01', statement: null };
    expect(buildEarnings({ ...base, wallet, adjustments: [bonus] }).wallet).toEqual({ EGP: { due: 50, paid: 30, this_month: 50 } });
  });

  it('voided after its statement was paid: paid stays, the pending reversal makes owed negative, not this month', () => {
    const voided = row(50, { status: 'voided', statement: { status: 'paid' } });
    expect(buildEarnings({ ...base, wallet: [voided], adjustments: [reversal(null)] }).wallet).toEqual({ EGP: { due: -50, paid: 50, this_month: 0 } });
  });

  it('voided inside an approved statement: nothing owed; nothing at all: an empty wallet', () => {
    const voided = row(50, { status: 'voided', statement: { status: 'approved' } });
    expect(buildEarnings({ ...base, wallet: [voided], adjustments: [reversal(null)] }).wallet).toEqual({ EGP: { due: 0, paid: 0, this_month: 0 } });
    expect(buildEarnings(base).wallet).toEqual({});
  });
});
