import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { isOffline } from '@/payments/payment-errors';
import { ReceiptUploadError } from '@/payments/upload-receipt';

const messages: Record<string, string | undefined> = t.salesMoney.error;

function codeOf(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const body = error.body;
  if (typeof body !== 'object' || body === null || !('code' in body)) return undefined;
  return typeof body.code === 'string' ? body.code : undefined;
}

/**
 * What the sales money screens say when a call failed: the API's code in her words
 * (not_your_student, media_expired, receipt_path…), an honest «no answer» offline, else generic.
 */
export function salesErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (isOffline(error)) return t.payments.mobile.offline;
  const code = codeOf(error);
  return (code === undefined ? undefined : messages[code]) ?? t.salesMoney.error.generic;
}
