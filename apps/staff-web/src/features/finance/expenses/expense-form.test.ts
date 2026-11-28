import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { expenseBody, expenseForm } from './expense-form';

const form = expenseForm(null, '2026-10-05');
const EXPENSE = {
  id: '00000000-0000-4000-8000-000000000001',
  month: '2026-10',
  category: 'ads',
  amount: 10,
  currency: 'EGP',
  note: null,
  created_at: '2026-10-02T10:00:00Z',
  paid_on: null,
  vendor: null,
  method: null,
  has_receipt: false,
  recurring: false,
  is_draft: false,
};

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

  it('a stored card method opens blank: the form offers only the manual methods', () => {
    const card = { ...EXPENSE, method: 'card' as const };
    expect(expenseForm(card, '2026-10-05').method).toBe('');
    expect(expenseForm({ ...card, method: 'wallet' }, '2026-10-05').method).toBe('wallet');
  });
});
