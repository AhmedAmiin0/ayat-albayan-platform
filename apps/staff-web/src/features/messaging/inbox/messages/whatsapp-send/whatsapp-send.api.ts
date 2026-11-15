import { appSendRefusal } from '@ab/shared';
import { ApiError, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

/**
 * «أرسل عبر واتساب» (docs/19): the platform keeps off the row for 10 minutes (app_send_until);
 * the app's echo confirms the send. A second call extends the window. The row is read again
 * with the chat (onSettled), so the answer is not kept.
 */
export const startAppSend = (id: string) => apiSend('POST', `/messages/${id}/app-send`);

const REFUSALS = {
  sending: () => t.messages.alreadySending,
  sent: () => t.messages.whatsappSend.alreadySent,
  other: () => t.messages.whatsappSend.notNow,
} as const;

/** A refused tap in words, from the 409 body's status (never «المنصة ترسلها» for a sent row). */
export function appSendError(e: Error | null): string | null {
  if (!e) return null;
  const refusal = appSendRefusal(e instanceof ApiError ? e.body : null);
  return refusal ? REFUSALS[refusal]() : t.common.error;
}
