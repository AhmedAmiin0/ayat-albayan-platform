import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { isOffline } from '@/payments/payment-errors';

const messages: Record<string, string | undefined> = t.teacherEarnings.error;

/** What the pay form says when POST /teachers/:id/earnings/payments failed (`{ code }` of the API). */
export function earningsErrorText(error: unknown): string {
  if (isOffline(error)) return t.payments.mobile.offline;
  if (!(error instanceof ApiError)) return t.common.error;
  const body = error.body;
  const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined;
  return (typeof code === 'string' ? messages[code] : undefined) ?? t.common.error;
}
