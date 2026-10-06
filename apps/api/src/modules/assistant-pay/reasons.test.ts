import { describe, expect, it } from 'vitest';
import { ar } from '../../common/i18n/server-text';
import { toCommissionView, type CommissionRow } from './commissions.mapper';
import { reasonText } from './reasons';
import { statementRow } from './rows.fakes';
import { toStatementView } from './statements.mapper';

describe('reasonText: the codes the database writes never reach a reader as raw strings', () => {
  it('payment_voided and student_merged become the academy text', () => {
    expect(reasonText('payment_voided')).toBe(ar.assistantReasons.payment_voided);
    expect(reasonText('student_merged')).toBe(ar.assistantReasons.student_merged);
    expect(reasonText('payment_voided')).not.toBe('payment_voided');
  });

  it('a reason an admin typed is shown as typed, null stays null, and object keys are not codes', () => {
    expect(reasonText('خطأ في الإدخال')).toBe('خطأ في الإدخال');
    expect(reasonText(null)).toBeNull();
    expect(reasonText('constructor')).toBe('constructor');
    expect(reasonText('toString')).toBe('toString');
  });
});

describe('the reason of an adjustment line and of a ledger row goes through reasonText', () => {
  it('a statement line of an automatic reversal shows the text, not payment_voided', () => {
    const view = toStatementView(statementRow({ lines: [
      { kind: 'adjustment', amount: -20, currency: 'SAR', commission: null, adjustment: { reason: 'payment_voided' } },
      { kind: 'adjustment', amount: -5, currency: 'SAR', commission: null, adjustment: { reason: 'خصم يدوي' } },
    ] }));
    expect(view.lines.map((l) => l.reason)).toEqual([ar.assistantReasons.payment_voided, 'خصم يدوي']);
    expect(JSON.stringify(view)).not.toContain('payment_voided');
  });

  it('the admin ledger shows the same text for an automatic void', () => {
    const row = {
      id: 'c1', assistant_id: 'a1', student_id: 's1', subscription_id: 'sub', commission_type: 'percent', rate: 10, base_amount: 290, base_currency: 'SAR',
      amount: 29, currency: 'SAR', earned_at: 'e', status: 'voided', voided_at: 'v', void_reason: 'payment_voided', void_auto: true, statement_id: null,
      assistant: { id: 'a1', full_name: 'الزهراء' }, student: { id: 's1', code: 'AB-1', name: 'ن' },
    } as unknown as CommissionRow;
    expect(toCommissionView(row).void_reason).toBe(ar.assistantReasons.payment_voided);
  });
});
