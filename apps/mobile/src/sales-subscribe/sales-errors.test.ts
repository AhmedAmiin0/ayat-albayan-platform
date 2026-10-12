import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ReceiptUploadError } from '@/payments/upload-receipt';
import { salesErrorText } from './sales-errors';

test('the API codes in her words', () => {
  expect(salesErrorText(new ApiError(403, { code: 'not_your_student' }))).toBe(t.salesMoney.error.not_your_student);
  expect(salesErrorText(new ApiError(410, { code: 'media_expired' }))).toBe(t.salesMoney.error.media_expired);
  expect(salesErrorText(new ApiError(409, { code: 'client_request_reused' }))).toBe(
    t.salesMoney.error.client_request_reused,
  );
  expect(salesErrorText(new ApiError(400, { code: 'discount_not_allowed' }))).toBe(t.salesMoney.error.discount_not_allowed);
});

test('currency_mismatch names the package currency from the body', () => {
  const text = salesErrorText(new ApiError(400, { code: 'currency_mismatch', currency: 'SAR' }));
  expect(text).toBe(t.salesMoney.error.currency_mismatch.replace('{currency}', 'SAR'));
  expect(text).toContain('SAR');
  expect(text).not.toContain('{currency}');
});

test('no answer, a failed upload, an unknown code', () => {
  expect(salesErrorText(new TypeError('Network request failed'))).toBe(t.payments.mobile.offline);
  expect(salesErrorText(new ReceiptUploadError('x'))).toBe(t.payments.mobile.uploadFailed);
  expect(salesErrorText(new ApiError(500, null))).toBe(t.salesMoney.error.generic);
  expect(salesErrorText(new ApiError(400, { code: 'nope' }))).toBe(t.salesMoney.error.generic);
});
