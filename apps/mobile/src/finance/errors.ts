import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ReceiptUploadError } from '@/payments/upload-receipt';

const messages: Record<string, string | undefined> = {
  ...t.earnings.error,
  ...t.payouts.error,
  ...t.finance.error,
  ...t.payments.error,
  reason_required: t.finance.reasonRequired,
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The API's `{ code }`, or the first known message of a zod `validation_failed`. */
function codeOf(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  if (typeof body['code'] === 'string') return body['code'];
  const issues: unknown[] = Array.isArray(body['issues']) ? body['issues'] : [];
  return issues
    .map((i) => (isRecord(i) ? i['message'] : undefined))
    .find((m): m is string => typeof m === 'string' && messages[m] !== undefined);
}

/** What a finance action says when it failed; the list behind it is unchanged. */
export function financeErrorText(error: unknown): string {
  if (error instanceof ReceiptUploadError) return t.payments.mobile.uploadFailed;
  if (error instanceof TypeError) return t.mobileFinance.offline;
  const code = error instanceof ApiError ? codeOf(error.body) : undefined;
  return (code ? messages[code] : undefined) ?? t.common.error;
}
