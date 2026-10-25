import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { expenseBody, expenseForm } from './expense-form';

const form = expenseForm(null, '2026-10-05');

describe('expense form', () => {
  it('a new expense defaults to today, EGP, not recurring', () => {
    expect(form).toMatchObject({ category: 'ads', currency: 'EGP', paidOn: '2026-10-05', recurring: false, method: '' });
  });

  it('amount errors are field errors, never a silent no-op', () => {
    expect(expenseBody({ ...form, amount: '' }, '2026-10')).toEqual({ ok: false, errors: { amount: t.common.required } });
    expect(expenseBody({ ...form, amount: '0' }, '2026-10')).toEqual({ ok: false, errors: { amount: t.payments.mobile.amountInvalid } });
    expect(expenseBody({ ...form, amount: '1.234' }, '2026-10').ok).toBe(false);
  });

  it('the paid day decides the month; empty optional fields are null; Arabic digits are read', () => {
    const r = expenseBody({ ...form, amount: '١٢٠٠', paidOn: '2026-09-28', vendor: ' ', method: 'bank', recurring: true }, '2026-10');
    expect(r).toEqual({
      ok: true,
      body: { month: '2026-09', category: 'ads', amount: 1200, currency: 'EGP', paidOn: '2026-09-28', vendor: null, method: 'bank', recurring: true, note: null },
    });
    const noDay = expenseBody({ ...form, amount: '5', paidOn: '' }, '2026-10');
    expect(noDay.ok && noDay.body.month).toBe('2026-10');
  });
});
