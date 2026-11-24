import { APP_SEND_GRACE_MS, appSendUnconfirmed, type MessageView } from '@ab/shared';

// docs/19: once tapped the platform never sends the row itself, so the bubble asks staff.

export type AppSendLine = 'offer' | 'pending' | 'unconfirmed';

/** Sent manually is never sent again; the server refuses retrying a row handed to WhatsApp. */
export type AppSendAnswer = 'sentIt' | 'yes';

/** Staff's answers per state: none on the offer. */
export const APP_SEND_ANSWERS: Record<AppSendLine, readonly AppSendAnswer[]> = {
  offer: [],
  pending: ['sentIt'],
  unconfirmed: ['yes'],
};

/** Each answer's words: the key under `messages.whatsappSend` in the i18n files. */
export const APP_SEND_ANSWER_KEYS = {
  sentIt: 'sentIt',
  yes: 'yes',
} as const satisfies Record<AppSendAnswer, string>;

/** Each answer's endpoint: POST /messages/:id/<action>. */
export const APP_SEND_ANSWER_ACTIONS = {
  sentIt: 'sent-manually',
  yes: 'sent-manually',
} as const satisfies Record<AppSendAnswer, string>;

type LineRow = Pick<MessageView, 'status' | 'error_code' | 'app_send_until'>;

/** The platform still waits for the echo: the window or its grace (APP_SEND_GRACE_MS) is open. */
const waiting = (m: LineRow, now: Date): boolean =>
  Date.parse(m.app_send_until ?? '') + APP_SEND_GRACE_MS > now.getTime();

/** Pending while the window or grace is open; asked once the sweep found no echo. */
export function appSendLineOf(m: LineRow, now: Date): AppSendLine {
  if (waiting(m, now)) return 'pending';
  return appSendUnconfirmed(m) ? 'unconfirmed' : 'offer';
}
