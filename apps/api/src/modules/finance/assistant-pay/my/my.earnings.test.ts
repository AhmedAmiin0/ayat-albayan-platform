import type { AssistantStatementView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { buildEarnings, commissionsTotal, frozenLines } from './my.earnings';
import type { MyAdjustment, MyCommission } from './my.queries';

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
const base = { now: NOW, tz: 'Asia/Riyadh', terms: TERMS, commissions: [], adjustments: [], frozen: [], statements: [] };

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

describe('buildEarnings: «محفظتي» from the frozen statement lines (owner 2026-10-29)', () => {
  const earned = (amount: number, over: Partial<MyCommission> = {}): MyCommission =>
    ({ id: 'c1', amount, currency: 'EGP', earned_at: '2026-10-05T10:00:00Z', statement: null, ...over });
  const reversal = (statement: MyAdjustment['statement']): MyAdjustment =>
    ({ id: 'r1', kind: 'reversal', amount: -50, currency: 'EGP', effective_month: '2026-11-01', statement });
  const line = (kind: string, amount: number, adjustment: { kind: string; reason: string } | null = null) =>
    ({ kind, amount, currency: 'EGP', commission: null, adjustment });
  const back = line('adjustment', -50, { kind: 'reversal', reason: 'payment_voided' });
  const frozen = (...s: { status: 'draft' | 'approved' | 'paid'; lines: ReturnType<typeof line>[] }[]) => frozenLines(s);

  it('frozenLines: commission and reversal lines of approved and paid statements; never a draft, the salary or a manual one', () => {
    const bonus = line('adjustment', 100, { kind: 'manual', reason: 'مكافأة' });
    expect(frozen({ status: 'paid', lines: [line('salary', 1000), line('commission', 30), bonus, back] }, { status: 'draft', lines: [line('commission', 9)] }))
      .toEqual([{ amount: 30, currency: 'EGP', statement: { status: 'paid' } }, { amount: -50, currency: 'EGP', statement: { status: 'paid' } }]);
  });

  it('owed, paid and this month per currency; the admin’s own adjustments stay out', () => {
    const commissions = [earned(50), earned(30, { statement: { status: 'paid' }, earned_at: '2026-09-05T10:00:00Z' })];
    const bonus = { id: 'b1', kind: 'manual', amount: 100, currency: 'EGP', effective_month: '2026-10-01', statement: null };
    const out = buildEarnings({ ...base, commissions, adjustments: [bonus], frozen: frozen({ status: 'paid', lines: [line('commission', 30)] }) });
    expect(out.wallet).toEqual({ EGP: { due: 50, paid: 30, this_month: 50 } });
  });

  it('voided after its statement was paid: paid stays, the pending reversal makes owed negative, not this month', () => {
    const out = buildEarnings({ ...base, frozen: frozen({ status: 'paid', lines: [line('commission', 50)] }), adjustments: [reversal(null)] });
    expect(out.wallet).toEqual({ EGP: { due: -50, paid: 50, this_month: 0 } });
  });

  it('voided inside an approved statement (or its student merged away): the line and the reversal net to 0 owed', () => {
    const out = buildEarnings({ ...base, frozen: frozen({ status: 'approved', lines: [line('commission', 50)] }), adjustments: [reversal(null)] });
    expect(out.wallet).toEqual({ EGP: { due: 0, paid: 0, this_month: 0 } });
    expect(buildEarnings(base).wallet).toEqual({});
  });

  it('reopened to a draft with a voided commission (its reversal dropped): nothing owed until the admin rebuilds it', () => {
    expect(buildEarnings({ ...base, frozen: frozen({ status: 'draft', lines: [line('commission', 50)] }) }).wallet).toEqual({});
  });

  it('earned again after its reversal was paid back: paid 0 and owed 50, from the lines, not the row’s statement', () => {
    const out = buildEarnings({ ...base, commissions: [earned(50)], frozen: frozen({ status: 'paid', lines: [line('commission', 50)] }, { status: 'paid', lines: [back] }) });
    expect(out.wallet).toEqual({ EGP: { due: 50, paid: 0, this_month: 50 } });
  });

  it('earned again while its reversal waits in a draft: the approved line is still owed, the draft nets to 0', () => {
    const out = buildEarnings({ ...base, commissions: [earned(50)], adjustments: [reversal({ status: 'draft' })], frozen: frozen({ status: 'approved', lines: [line('commission', 50)] }) });
    expect(out.wallet).toEqual({ EGP: { due: 50, paid: 0, this_month: 50 } });
  });
});
