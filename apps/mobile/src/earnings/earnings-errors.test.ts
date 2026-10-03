import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ReceiptUploadError } from '@/payments/upload-receipt';
import { earningsErrorText } from './earnings-errors';

test('the API code maps to the earnings wording', () => {
  expect(earningsErrorText(new ApiError(409, { code: 'overpayment' }))).toBe(t.earnings.error.overpayment);
  expect(earningsErrorText(new ApiError(404, { code: 'teacher_not_linked' }))).toBe(t.earnings.error.teacher_not_linked);
});

test('upload failure, no answer at all, unknown codes and non-API errors', () => {
  expect(earningsErrorText(new ReceiptUploadError('x'))).toBe(t.payments.mobile.uploadFailed);
  expect(earningsErrorText(new TypeError('Network request failed'))).toBe(t.payments.mobile.offline);
  expect(earningsErrorText(new ApiError(500, { code: 'boom' }))).toBe(t.common.error);
  expect(earningsErrorText(new ApiError(500, null))).toBe(t.common.error);
  expect(earningsErrorText(new Error('x'))).toBe(t.common.error);
});
