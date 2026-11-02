import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';
import { financeErrorText } from './errors';

test('a known API code gets its own sentence, from any finance table', () => {
  expect(financeErrorText(new ApiError(409, { code: 'reports_pending' }))).toBe(t.payouts.error.reports_pending);
  expect(financeErrorText(new ApiError(409, { code: 'already_voided' }))).toBe(t.finance.error.already_voided);
  expect(financeErrorText(new ApiError(400, { code: 'receipt_too_large' }))).toBe(t.payments.error.receipt_too_large);
});

test('a zod issue message is read when it is a known code', () => {
  const body = { code: 'validation_failed', issues: [{ message: 'x' }, { message: 'reason_required' }] };
  expect(financeErrorText(new ApiError(400, { issues: body.issues }))).toBe(t.finance.reasonRequired);
});

test('no answer is offline, a failed upload says so, anything else is the generic line', () => {
  expect(financeErrorText(new TypeError('Network request failed'))).toBe(t.mobileFinance.offline);
  expect(financeErrorText(new ReceiptUploadError('x'))).toBe(t.payments.mobile.uploadFailed);
  expect(financeErrorText(new ApiError(500, null))).toBe(t.common.error);
  expect(financeErrorText(new ApiError(409, { code: 'nope' }))).toBe(t.common.error);
});
