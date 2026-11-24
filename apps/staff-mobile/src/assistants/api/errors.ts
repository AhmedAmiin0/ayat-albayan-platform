import { ApiError, t } from '@ab/mobile-kit';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

const messages: Record<string, string | undefined> = { ...t.assistants.error };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The API's `{ code }`, else the first issue message of a zod `validation_failed` (the web's apiErrorText). */
function codeOf(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  if (typeof body['code'] === 'string') return body['code'];
  const first: unknown = Array.isArray(body['issues']) ? body['issues'][0] : undefined;
  return isRecord(first) && typeof first['message'] === 'string' ? first['message'] : undefined;
}

export function assistantsErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (error instanceof TypeError) return t.mobileFinance.offline;
  const code = error instanceof ApiError ? codeOf(error.body) : undefined;
  return (code ? messages[code] : undefined) ?? t.common.error;
}

/** Unknown keys fall back to a generic check-this-value text. */
export function fieldError(key: string | undefined): string | undefined {
  if (key === undefined) return undefined;
  return messages[key] ?? t.assistants.error.invalid;
}
