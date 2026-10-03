import { t } from '@/lib/i18n';
import { checkAmount } from './pay-form';

test('the prefilled total and a part-payment are both accepted', () => {
  expect(checkAmount('150', 150)).toEqual({ amount: 150 });
  expect(checkAmount('40.5', 150)).toEqual({ amount: 40.5 });
  expect(checkAmount('٤٠٫٥', 150)).toEqual({ amount: 40.5 });
});

test('more than what is owed is blocked with the over-payment wording', () => {
  expect(checkAmount('150.01', 150)).toEqual({ error: t.teacherEarnings.error.over_payment });
  expect(checkAmount('151', 150).amount).toBeUndefined();
});

test('empty, zero, negative and 3 decimals are refused', () => {
  expect(checkAmount('', 150)).toEqual({ error: t.common.required });
  expect(checkAmount('0', 150).error).toBe(t.payments.mobile.amountInvalid);
  expect(checkAmount('-5', 150).error).toBe(t.payments.mobile.amountInvalid);
  expect(checkAmount('1.234', 150).error).toBe(t.payments.mobile.amountInvalid);
  expect(checkAmount('abc', 150).error).toBe(t.payments.mobile.amountInvalid);
});
