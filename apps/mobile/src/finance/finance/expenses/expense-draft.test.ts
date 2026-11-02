import { t } from '@/core/lib/i18n/i18n';
import { checkExpense, emptyExpense, expenseBody } from './expense-draft';

const NOW = new Date('2026-10-05T09:00:00Z');
const draft = { ...emptyExpense(), category: 'ads', amountText: '250.5' };

test('a category and a positive amount are required before anything is sent', () => {
  expect(checkExpense(emptyExpense())).toEqual({
    ok: false,
    errors: { category: t.mobileFinance.expenses.categoryRequired, amount: t.common.required },
  });
  expect(checkExpense({ ...draft, amountText: '0' }).errors.amount).toBe(t.payments.mobile.amountInvalid);
  expect(checkExpense({ ...draft, amountText: 'abc' }).errors.amount).toBe(t.payments.mobile.amountInvalid);
  expect(checkExpense(draft)).toEqual({ ok: true, errors: {} });
});

test('Arabic digits are read; the body carries the Riyadh paid day and no month', () => {
  expect(checkExpense({ ...draft, amountText: '٢٥٠٫٥' }).ok).toBe(true);
  expect(expenseBody(draft, null, NOW)).toEqual({
    category: 'ads',
    amount: 250.5,
    currency: 'EGP',
    paidOn: '2026-10-05',
    vendor: null,
    method: null,
    receiptPath: null,
    note: null,
  });
});

test('an earlier day, trimmed texts, the method and the uploaded receipt path', () => {
  const body = expenseBody({ ...draft, daysAgo: 6, vendor: ' ميتا ', note: ' x ', method: 'bank' }, 'expenses/a.jpg', NOW);
  expect(body).toMatchObject({ paidOn: '2026-09-29', vendor: 'ميتا', note: 'x', method: 'bank', receiptPath: 'expenses/a.jpg' });
});
