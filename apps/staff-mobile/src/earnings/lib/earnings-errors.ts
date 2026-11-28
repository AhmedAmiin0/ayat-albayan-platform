import { ApiError, t } from '@ab/mobile-kit';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

const messages: Record<string, string | undefined> = t.earnings.error;

/** The pay form's failure line (a lost reply is safe to retry: same clientRequestId). */
export function earningsErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (error instanceof TypeError) return t.payments.mobile.offline;
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return t.common.error;
  const code = (error.body as { code?: unknown }).code;
  return (typeof code === 'string' ? messages[code] : undefined) ?? t.common.error;
}
