import { appSendRefusal } from '@ab/shared';
import { ApiError, apiSend } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Keeps the platform off the row for 10 min (app_send_until); a repeat extends it (docs/19). */
export const startAppSend = (id: string) => apiSend('POST', `/messages/${id}/app-send`);

const REFUSALS = {
  sending: () => t.messages.alreadySending,
  sent: () => t.messages.whatsappSend.alreadySent,
  other: () => t.messages.whatsappSend.notNow,
} as const;

export function appSendError(e: Error | null): string | null {
  if (!e) return null;
  const refusal = appSendRefusal(e instanceof ApiError ? e.body : null);
  return refusal ? REFUSALS[refusal]() : t.common.error;
}
