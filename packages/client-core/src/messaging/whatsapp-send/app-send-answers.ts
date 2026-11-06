import { APP_SEND_GRACE_MS, appSendUnconfirmed, type MessageView } from '@ab/shared';

// «أرسل عبر واتساب» (docs/19): once tapped the platform never sends the row itself, so the bubble
// asks staff. Web and mobile read the same states and answers from here.

/** What a «أرسل عبر واتساب» row shows: the offer, its open window, or the question. */
export type AppSendLine = 'offer' | 'pending' | 'unconfirmed';

/** «أرسلتها» / «نعم»: sent-manually (never sent again); «لا، أعدها للانتظار»: the retry (held). */
export type AppSendAnswer = 'sentIt' | 'yes' | 'hold';

/** Staff's answers per state: none on the offer. */
export const APP_SEND_ANSWERS: Record<AppSendLine, readonly AppSendAnswer[]> = {
  offer: [],
  pending: ['sentIt'],
  unconfirmed: ['yes', 'hold'],
};

/** Each answer's words: the key under `messages.whatsappSend` in the i18n files. */
export const APP_SEND_ANSWER_KEYS = {
  sentIt: 'sentIt',
  yes: 'yes',
  hold: 'backToHold',
} as const satisfies Record<AppSendAnswer, string>;

/** Each answer's endpoint: POST /messages/:id/<action> (sent-manually, or the retry). */
export const APP_SEND_ANSWER_ACTIONS = {
  sentIt: 'sent-manually',
  yes: 'sent-manually',
  hold: 'retry',
} as const satisfies Record<AppSendAnswer, string>;

type LineRow = Pick<MessageView, 'status' | 'error_code' | 'app_send_until'>;

/** The platform still waits for the echo: the window or its grace (APP_SEND_GRACE_MS) is open. */
const waiting = (m: LineRow, now: Date): boolean =>
  Date.parse(m.app_send_until ?? '') + APP_SEND_GRACE_MS > now.getTime();

/**
 * Pending while the tap's window or its grace is open (staff can still say «أرسلتها»); asked once
 * the sweep found no echo (app_send_unconfirmed); else offered.
 */
export function appSendLineOf(m: LineRow, now: Date): AppSendLine {
  if (waiting(m, now)) return 'pending';
  return appSendUnconfirmed(m) ? 'unconfirmed' : 'offer';
}
