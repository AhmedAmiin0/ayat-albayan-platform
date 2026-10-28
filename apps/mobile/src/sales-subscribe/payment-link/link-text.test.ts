import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { paymentLink } from '../testing/link-fixtures';
import { agreedLine, checkAmount, linkErrorText, linkMessage, minLine, referenceLine } from './link-text';

const pl = t.paymentLinks;
const CAP = { reference: 180, maxDiscountPct: 10 };

test('the agreed amount: positive, ≤ 2 decimals, Arabic digits too, not below the cap', () => {
  expect(checkAmount('170', CAP)).toEqual({ ok: true, amount: 170 });
  expect(checkAmount('١٦٢', CAP)).toEqual({ ok: true, amount: 162 });
  expect(checkAmount('161.99', CAP)).toEqual({ ok: false, error: pl.error.discount_too_large });
  expect(checkAmount('0', CAP)).toEqual({ ok: false, error: t.salesMoney.error.amount });
  expect(checkAmount('', CAP)).toEqual({ ok: false, error: t.salesMoney.error.amount });
  expect(checkAmount('1', { reference: 180, maxDiscountPct: null })).toEqual({ ok: true, amount: 1 });
});

test('the chat text: the student, the lessons, the amount and the platform link', () => {
  const text = linkMessage(paymentLink());
  expect(text).toContain('ريم');
  expect(text).toContain('12');
  expect(text).toContain('170');
  expect(text).toContain('https://app.example.test/pay/tok-1');
  expect(text).not.toMatch(/\{\w+\}/);
});

test('reference, minimum and agreed lines carry the isolated amount', () => {
  expect(referenceLine(180, 'SAR')).toContain(ltr('180'));
  expect(minLine(162, 'SAR')).toContain(ltr('162'));
  expect(agreedLine(170, 'SAR')).toContain(ltr('170'));
  expect(referenceLine(180, 'SAR')).not.toMatch(/\{\w+\}/);
});

test('API codes in her words; currency_mismatch names the package currency; else the fallback', () => {
  expect(linkErrorText(new ApiError(403, { code: 'discount_not_allowed' }))).toBe(pl.error.discount_not_allowed);
  expect(linkErrorText(new ApiError(400, { code: 'not_a_renewal' }))).toBe(pl.error.not_a_renewal);
  expect(linkErrorText(new ApiError(400, { code: 'currency_mismatch', currency: 'USD' }))).toBe(
    pl.error.currency_mismatch.replace('{currency}', 'USD'),
  );
  expect(linkErrorText(new ApiError(409, { code: 'link_not_open' }), pl.mobile.cancelFailed)).toBe(pl.error.link_not_open);
  expect(linkErrorText(new Error('offline'), pl.mobile.cancelFailed)).toBe(pl.mobile.cancelFailed);
});
