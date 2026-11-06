import type { Tables, TablesUpdate } from '@ab/db';
import { APP_SEND_GRACE_MS, APP_SEND_MS, foldText } from '@ab/shared';
import type { DeliveryStatus, StatusEvent } from '@/modules/messaging/webhook/webhook.events';

// «أرسل عبر واتساب» (owner 2026-11-06, docs/19): staff tapped it (app_send_until set), then sent
// the text from the WhatsApp Business app. The message comes back on any external path (the echo,
// Kapso's status of an unknown wamid, the catch-up job): pure rules for which row it confirms.
// Same phone (the read), same line / number, the same text after folding whitespace, a window set
// around the message (appSendSpan), and no wamid on the row yet.

/** A row the tap opened a window on, as the attach reads it. */
export type AppSendRow = Pick<
  Tables<'messages'>,
  'id' | 'body' | 'line' | 'number_id' | 'app_send_until' | 'lead_id' | 'dedup_key' | 'status'
>;

/** Where the message came from: its line and wa_numbers row, when known. */
export interface EchoOrigin {
  line: string | null;
  numberId: string | null;
}

/** Two known values must agree; an unknown one (a single line, a row never routed) does not. */
const agrees = (a: string | null, b: string | null): boolean => a === null || b === null || a === b;

const sameOrigin = (row: AppSendRow, from: EchoOrigin): boolean =>
  agrees(row.number_id, from.numberId) && agrees(row.line, from.line);

const untilOf = (row: AppSendRow): number => Date.parse(row.app_send_until ?? '');
/** A row marked «نعم، أرسلتها» earlier comes after every queued / failed one (the tap's own). */
const markedRank = (row: AppSendRow): number => (row.status === 'sent_manually' ? 1 : 0);
const byOrder = (a: AppSendRow, b: AppSendRow): number =>
  markedRank(a) - markedRank(b) || untilOf(a) - untilOf(b);

/**
 * The rows the message may be: queued / failed first, a row already marked sent by hand only when
 * none matches; earliest window first (two identical texts: the first takes the first message).
 * Never a row with another text or from another line / number. Empty: insert.
 */
export function appSendMatches(
  rows: readonly AppSendRow[],
  message: { body: string; from: EchoOrigin },
): AppSendRow[] {
  const text = foldText(message.body);
  const same = (r: AppSendRow): boolean =>
    text !== '' && foldText(r.body ?? '') === text && sameOrigin(r, message.from);
  return rows.filter(same).sort(byOrder);
}

/**
 * The windows a message sent at `at` may answer: one still open, or one that ended at most
 * APP_SEND_GRACE_MS before it (the platform waits as long); a tap no later than that after it.
 */
export function appSendSpan(at: Date): { since: Date; until: Date } {
  return {
    since: new Date(at.getTime() - APP_SEND_GRACE_MS),
    until: new Date(at.getTime() + APP_SEND_MS + APP_SEND_GRACE_MS),
  };
}

type Patch = Pick<TablesUpdate<'messages'>, 'status' | 'sent_at' | 'delivered_at' | 'read_at'>;
/** Sent, delivered or read; a failed status has none (never attached). */
const PATCHES: Partial<Record<StatusEvent['status'], (sent: string, at: string) => Patch>> = {
  sent: (sent) => ({ status: 'sent', sent_at: sent }),
  delivered: (sent, at) => ({ status: 'delivered', sent_at: sent, delivered_at: at }),
  read: (sent, at) => ({ status: 'read', sent_at: sent, delivered_at: at, read_at: at }),
};

/** The message as the attach reads it: WhatsApp's time and Kapso's stored status, if any. */
interface SentMessage {
  at: Date;
  status: DeliveryStatus | null;
}

/**
 * The attached row's status and times: the status event's, else Kapso's stored status of the
 * message (an echo or a catch-up item may carry one), else sent; sent at the message's time
 * (delivered / read fill the earlier steps). Failed: null, never attached (stored as its own row,
 * the held text stays as it is).
 */
const statusOf = (msg: SentMessage, event?: StatusEvent): DeliveryStatus =>
  event?.status ?? msg.status ?? 'sent';

export function attachPatch(msg: SentMessage, event?: StatusEvent): Patch | null {
  const patch = PATCHES[statusOf(msg, event)];
  const at = (event?.at ?? msg.at).toISOString();
  return patch ? patch(msg.at.toISOString(), at) : null;
}
