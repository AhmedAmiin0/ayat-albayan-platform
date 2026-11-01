import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

const messages: Record<string, string | undefined> = t.earnings.error;

/** What the pay form says when recording failed (a lost reply is safe to retry: same clientRequestId). */
export function earningsErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (error instanceof TypeError) return t.payments.mobile.offline;
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return t.common.error;
  const code = (error.body as { code?: unknown }).code;
  return (typeof code === 'string' ? messages[code] : undefined) ?? t.common.error;
}
