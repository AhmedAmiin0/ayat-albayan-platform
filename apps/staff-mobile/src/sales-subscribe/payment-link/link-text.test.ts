import { ApiError, t, ltr } from '@ab/mobile-kit';
import { paymentLink } from '@/sales-subscribe/testing/link-fixtures';
import { agreedLine, checkAmount, linkErrorText, linkMessage, minLine, referenceLine } from './link-text';

const pl = t.paymentLinks;
const FLOOR = { min: 162, currency: 'SAR' };

test('the agreed amount: positive, ≤ 2 decimals, Arabic digits too, not below the lowest amount', () => {
  expect(checkAmount('170', FLOOR)).toEqual({ ok: true, amount: 170 });
  expect(checkAmount('١٦٢', FLOOR)).toEqual({ ok: true, amount: 162 });
  expect(checkAmount('0', FLOOR)).toEqual({ ok: false, error: t.salesMoney.error.amount });
  expect(checkAmount('', FLOOR)).toEqual({ ok: false, error: t.salesMoney.error.amount });
  expect(checkAmount('1', { min: null, currency: 'SAR' })).toEqual({ ok: true, amount: 1 });
});

test('below the lowest amount: the line names it (10 on a 180 package, 2026-11-16)', () => {
  const low = { ok: false, error: minLine(162, 'SAR') };
  expect(checkAmount('161.99', FLOOR)).toEqual(low);
  expect(checkAmount('10', { min: 153, currency: 'SAR' })).toEqual({
    ok: false,
    error: minLine(153, 'SAR'),
  });
});

test('an amount the API refused under the floor says the lowest amount, never the pills’ line', () => {
  const pills = new ApiError(403, { code: 'discount_not_allowed', min: 153, currency: 'SAR' });
  expect(linkErrorText(pills)).toBe(minLine(153, 'SAR'));
  const cap = new ApiError(400, { code: 'discount_too_large', min: 162, currency: 'SAR' });
  expect(linkErrorText(cap, 'fallback')).toBe(minLine(162, 'SAR'));
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
