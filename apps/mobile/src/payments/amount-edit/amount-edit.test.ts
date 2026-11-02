import { t } from '@/core/lib/i18n/i18n';
import { amountEditable, checkNewAmount, salesAmountEditable } from './amount-edit';

test('a new amount: positive, ≤ 2 decimals, Arabic digits too', () => {
  expect(checkNewAmount('150', 145)).toEqual({ ok: true, amount: 150 });
  expect(checkNewAmount('١٤٠٫٥', 145)).toEqual({ ok: true, amount: 140.5 });
  expect(checkNewAmount('0', 145)).toEqual({ ok: false, error: t.payments.mobile.amountInvalid });
  expect(checkNewAmount('1.234', 145)).toEqual({ ok: false, error: t.payments.mobile.amountInvalid });
});

test('the same amount asks nothing', () => {
  expect(checkNewAmount('145', 145)).toEqual({ ok: false, error: t.payments.editAmount.same });
});

test('a card (Stripe) amount is never edited; hers is a payment only', () => {
  expect(amountEditable({ method: 'card' })).toBe(false);
  expect(amountEditable({ method: 'bank' })).toBe(true);
  expect(salesAmountEditable({ method: 'bank', kind: 'payment' })).toBe(true);
  expect(salesAmountEditable({ method: 'bank', kind: 'refund' })).toBe(false);
  expect(salesAmountEditable({ method: 'card', kind: 'payment' })).toBe(false);
});
