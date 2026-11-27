import { messageStatusCalls } from '@ab/client-core';
import { appSendRefusal } from '@ab/shared';
import { ApiError, apiFetch, apiSend, t } from '@ab/web-kit';

const messageStatus = messageStatusCalls({ apiFetch, apiSend });

/** Keeps the platform off the row for 10 min (app_send_until); a repeat extends it (docs/19). */
export const startAppSend = messageStatus.appSend;

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
