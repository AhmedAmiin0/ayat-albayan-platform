import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { isOffline } from '@/payments/payment-errors';
import { ReceiptUploadError } from '@/payments/upload-receipt';

const messages: Record<string, string | undefined> = t.salesMoney.error;

function bodyOf(error: unknown): { code?: unknown; currency?: unknown } {
  if (!(error instanceof ApiError)) return {};
  const body = error.body;
  return typeof body === 'object' && body !== null ? body : {};
}

/**
 * What the sales money screens say when a call failed: the API's code in her words
 * (not_your_student, media_expired, receipt_path…; currency_mismatch names the package's), an honest «no answer» offline, else generic.
 */
export function salesErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (isOffline(error)) return t.payments.mobile.offline;
  const { code, currency } = bodyOf(error);
  const text = typeof code === 'string' ? messages[code] : undefined;
  if (text === undefined) return t.salesMoney.error.generic;
  return typeof currency === 'string' ? text.replace('{currency}', currency) : text;
}
