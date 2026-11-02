import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { isOffline } from '@/core/lib/money/payment-errors';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

const messages: Record<string, string | undefined> = t.salesMoney.error;

function bodyOf(error: unknown): { code?: unknown; currency?: unknown; issues?: unknown } {
  if (!(error instanceof ApiError)) return {};
  const body = error.body;
  return typeof body === 'object' && body !== null ? body : {};
}

/** `{ code }`, else the first known zod issue of `validation_failed` (too_many_attachments…). */
function codeOf(body: { code?: unknown; issues?: unknown }): string | undefined {
  if (typeof body.code === 'string') return body.code;
  const issues: unknown[] = Array.isArray(body.issues) ? body.issues : [];
  return issues
    .map((i) => (typeof i === 'object' && i !== null ? Reflect.get(i, 'message') : undefined))
    .find((m): m is string => typeof m === 'string' && messages[m] !== undefined);
}

/**
 * What the sales money screens say when a call failed: the API's code in her words
 * (not_your_student, media_expired, start_date_*, attachment_*…; currency_mismatch names the package's), an honest «no answer» offline, else generic.
 */
export function salesErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (isOffline(error)) return t.payments.mobile.offline;
  const body = bodyOf(error);
  const { currency } = body;
  const code = codeOf(body);
  const text = code === undefined ? undefined : messages[code];
  if (text === undefined) return t.salesMoney.error.generic;
  return typeof currency === 'string' ? text.replace('{currency}', currency) : text;
}
