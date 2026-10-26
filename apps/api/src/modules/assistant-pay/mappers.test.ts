import { describe, expect, it } from 'vitest';
import { toCommissionView, type CommissionRow } from './commissions/commissions.mapper';
import { toMyPayment, toMyStudent } from './my/my.mapper';
import { statementRow } from './rows.fakes';
import { readTotals, toStatementView } from './statements/statements.mapper';
import { termsColumns, toTermsView, type TermsRow } from './terms/terms.mapper';

const terms = (over: Partial<TermsRow> = {}): TermsRow =>
  ({
    assistant_id: 'a1', commission_type: 'fixed', commission_value: 50, commission_currency: 'EGP', commission_starts_on: '2026-10-01',
    salary_amount: 1000, salary_currency: 'SAR', salary_starts_on: '2026-10-01', created_at: '', updated_at: '', updated_by: null, ...over,
  }) as TermsRow;

describe('toTermsView / termsColumns', () => {
  it('a row becomes both parts, numbers as numbers; no row or cleared columns are null', () => {
    expect(toTermsView('a1', terms())).toEqual({
      assistant_id: 'a1', commission: { type: 'fixed', value: 50, currency: 'EGP', starts_on: '2026-10-01' }, salary: { amount: 1000, currency: 'SAR', starts_on: '2026-10-01' },
    });
    expect(toTermsView('a1', null)).toEqual({ assistant_id: 'a1', commission: null, salary: null });
    const cleared = terms({ commission_type: null, commission_value: null, commission_currency: null, commission_starts_on: null, salary_amount: null, salary_currency: null, salary_starts_on: null });
    expect(toTermsView('a1', cleared)).toEqual({ assistant_id: 'a1', commission: null, salary: null });
  });

  it('a percent drops any currency; a null part clears all three of its columns', () => {
    const percent = termsColumns('a1', { commission: { type: 'percent', value: 12.5, currency: 'SAR', startsOn: '2026-10-01' }, salary: null }, 'adm');
    expect(percent).toMatchObject({ commission_type: 'percent', commission_value: 12.5, commission_currency: null, salary_amount: null, salary_currency: null, salary_starts_on: null, updated_by: 'adm' });
  });
});

describe('toStatementView / readTotals', () => {
  it('readTotals keeps per-currency numbers and reads anything else as empty', () => {
    expect(readTotals({ SAR: { salary: 1, commissions: 2, adjustments: -1, total: 2 } })).toEqual({ SAR: { salary: 1, commissions: 2, adjustments: -1, total: 2 } });
    expect(readTotals({ SAR: { total: 'x' } })).toEqual({ SAR: { salary: 0, commissions: 0, adjustments: 0, total: 0 } });
    expect(readTotals([1])).toEqual({});
    expect(readTotals('x')).toEqual({});
    expect(readTotals({ SAR: 5 })).toEqual({});
  });

  it('an unknown line kind is dropped; the adjustment line carries its reason and no student', () => {
    const view = toStatementView(statementRow({ lines: [
      { kind: 'bonus', amount: 1, currency: 'SAR', commission: null, adjustment: null },
      { kind: 'adjustment', amount: -20, currency: 'SAR', commission: null, adjustment: { reason: 'استرداد' } },
    ] }));
    expect(view.lines).toEqual([{ kind: 'adjustment', amount: -20, currency: 'SAR', student: null, reason: 'استرداد' }]);
  });

  it('has_receipt is a flag, the path never leaves', () => {
    expect(toStatementView(statementRow({ receipt_path: null })).has_receipt).toBe(false);
    expect(Object.keys(toStatementView(statementRow()))).not.toContain('receipt_path');
  });
});

describe('toMyStudent / toMyPayment / toCommissionView', () => {
  it('a student row without a commission; one with a half-filled commission is no commission', () => {
    const r = { student_id: 's1', code: 'AB-1', name: 'ن', brought_at: '2026-10-01T00:00:00Z', first_subscription_paid: null, commission_id: null, commission_status: null, commission_amount: null, commission_currency: null, commission_earned_at: null };
    expect(toMyStudent(r)).toEqual({ id: 's1', code: 'AB-1', name: 'ن', brought_at: '2026-10-01T00:00:00Z', first_subscription_paid: false, commission: null });
    expect(toMyStudent({ ...r, commission_id: 'c', commission_status: 'earned' })?.commission).toBeNull();
    expect(toMyStudent({ ...r, student_id: null })).toBeNull();
    expect(toMyStudent({ ...r, brought_at: null })).toBeNull();
  });

  it('a voided commission keeps its status; a payment without a student reads empty names', () => {
    const r = { student_id: 's1', code: 'AB-1', name: 'ن', brought_at: 'x', first_subscription_paid: true, commission_id: 'c', commission_status: 'voided' as const, commission_amount: 29, commission_currency: 'SAR', commission_earned_at: 'y' };
    expect(toMyStudent(r)?.commission).toEqual({ amount: 29, currency: 'SAR', status: 'voided', earned_at: 'y' });
    const p = toMyPayment({ id: 'p', kind: 'refund', amount: 5, currency: 'SAR', method: 'cash', paid_at: 'z', note: null, subscription: null });
    expect(p.student).toEqual({ id: '', code: '', name: '' });
  });

  it('the admin ledger row names the assistant and the student and keeps the void reason', () => {
    const row = {
      id: 'c1', assistant_id: 'a1', student_id: 's1', subscription_id: 'sub', commission_type: 'percent', rate: 10, base_amount: 290, base_currency: 'SAR',
      amount: 29, currency: 'SAR', earned_at: 'e', status: 'voided', voided_at: 'v', void_reason: 'خطأ', void_auto: false, statement_id: null,
      assistant: { id: 'a1', full_name: 'الزهراء' }, student: { id: 's1', code: 'AB-1', name: 'ن' },
    } as unknown as CommissionRow;
    expect(toCommissionView(row)).toMatchObject({ assistant: { id: 'a1', name: 'الزهراء' }, student: { id: 's1', code: 'AB-1', name: 'ن' }, rate: 10, amount: 29, status: 'voided', void_reason: 'خطأ' });
  });
});
