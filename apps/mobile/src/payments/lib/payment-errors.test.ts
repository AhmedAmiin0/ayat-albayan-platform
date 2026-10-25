import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { isOffline, paymentErrorText } from './payment-errors';
import { ReceiptUploadError } from '../upload-receipt';

const e = t.payments.error;

test('no answer from the network is «offline»; an HTTP error is not', () => {
  expect(isOffline(new TypeError('Network request failed'))).toBe(true);
  expect(isOffline(new ApiError(500))).toBe(false);
  expect(paymentErrorText(new TypeError('Network request failed'))).toBe(t.payments.mobile.offline);
});

test('a refused receipt upload says so', () => {
  expect(paymentErrorText(new ReceiptUploadError('x'))).toBe(t.payments.mobile.uploadFailed);
});

test('API codes map to payments.error, the currency filled in', () => {
  const mismatch = new ApiError(400, { code: 'currency_mismatch', message: 'currency_mismatch', currency: 'SAR' });
  expect(paymentErrorText(mismatch)).toBe(e.currency_mismatch.replace('{currency}', 'SAR'));
  expect(paymentErrorText(new ApiError(404, { code: 'subscription_not_found' }))).toBe(
    e.subscription_not_found,
  );
  expect(paymentErrorText(new ApiError(409, { code: 'attachment_in_use' }))).toBe(e.attachment_in_use);
});

test('zod issues: the first one with a known message', () => {
  const body = {
    message: 'validation_failed',
    issues: [
      { path: 'note', message: 'too_long' },
      { path: 'paidAt', message: 'paid_at_future' },
    ],
  };
  expect(paymentErrorText(new ApiError(400, body))).toBe(e.paid_at_future);
  expect(paymentErrorText(new ApiError(400, { code: 'receipt_too_large' }))).toBe(e.receipt_too_large);
});

test('anything else is the common error', () => {
  expect(paymentErrorText(new ApiError(500))).toBe(t.common.error);
  expect(paymentErrorText(new ApiError(400, 'text body'))).toBe(t.common.error);
  expect(paymentErrorText(new ApiError(400, { issues: 'x' }))).toBe(t.common.error);
  expect(paymentErrorText(new Error('boom'))).toBe(t.common.error);
});
