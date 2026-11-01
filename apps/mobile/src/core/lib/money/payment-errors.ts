import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

const messages: Record<string, string | undefined> = t.payments.error;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * No answer at all: React Native's fetch rejects with «TypeError: Network request failed». The app
 * has no NetInfo, so this is how «offline» is known (an HTTP error is an ApiError instead).
 */
export function isOffline(error: unknown): boolean {
  return error instanceof TypeError;
}

/** The API's code: `{ code }` (docs/11 §3), or the first known zod issue of `validation_failed`. */
function codeOf(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  if (typeof body['code'] === 'string') return body['code'];
  const issues: unknown[] = Array.isArray(body['issues']) ? body['issues'] : [];
  return issues
    .map((i) => (isRecord(i) ? i['message'] : undefined))
    .find((m): m is string => typeof m === 'string' && messages[m] !== undefined);
}

/** What the payment form says when recording failed. The list behind it has already rolled back. */
export function paymentErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (isOffline(error)) return t.payments.mobile.offline;
  if (!(error instanceof ApiError)) return t.common.error;
  const code = codeOf(error.body);
  const text = code === undefined ? undefined : messages[code];
  if (text === undefined) return t.common.error;
  const currency = isRecord(error.body) ? error.body['currency'] : undefined;
  return text.replace('{currency}', typeof currency === 'string' ? currency : '');
}
