import type { Tables, TablesUpdate } from '@ab/db';
import { APP_SEND_GRACE_MS, APP_SEND_MS } from '@ab/shared';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';

// «أرسل عبر واتساب» (owner 2026-11-06, docs/19): staff tapped it (app_send_until set), then sent
// the text from the WhatsApp Business app. The message comes back on any external path (the echo,
// Kapso's status of an unknown wamid, the catch-up job): pure rules for which row it confirms.
// Same phone (the read), same line / number, the same text after folding whitespace, a window set
// around the message (appSendSpan), and no wamid on the row yet.

/** A row the tap opened a window on, as the attach reads it. */
export type AppSendRow = Pick<
  Tables<'messages'>,
  'id' | 'body' | 'line' | 'number_id' | 'app_send_until' | 'lead_id' | 'dedup_key'
>;

/** Where the message came from: its line and wa_numbers row, when known. */
export interface EchoOrigin {
  line: string | null;
  numberId: string | null;
}

/** Runs of spaces, tabs and line breaks become one space; the ends are trimmed. */
export const foldText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Two known values must agree; an unknown one (a single line, a row never routed) does not. */
const agrees = (a: string | null, b: string | null): boolean => a === null || b === null || a === b;

const sameOrigin = (row: AppSendRow, from: EchoOrigin): boolean =>
  agrees(row.number_id, from.numberId) && agrees(row.line, from.line);

const untilOf = (row: AppSendRow): number => Date.parse(row.app_send_until ?? '');

/**
 * The rows the message may be, earliest window first (two identical texts: the first takes the
 * first message). Never a row with another text or from another line / number. Empty: insert.
 */
export function appSendMatches(
  rows: readonly AppSendRow[],
  message: { body: string; from: EchoOrigin },
): AppSendRow[] {
  const text = foldText(message.body);
  const same = (r: AppSendRow): boolean =>
    text !== '' && foldText(r.body ?? '') === text && sameOrigin(r, message.from);
  return rows.filter(same).sort((a, b) => untilOf(a) - untilOf(b));
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

/**
 * The attached row's status and times: sent at the message's time (an echo, the catch-up), or
 * as the status event says (delivered / read fill the earlier steps). A failed event: null, the
 * message is stored as its own row and the held text stays as it is.
 */
export function attachPatch(sentAt: Date, event?: StatusEvent): Patch | null {
  const patch = PATCHES[event?.status ?? 'sent'];
  const at = (event?.at ?? sentAt).toISOString();
  return patch ? patch(sentAt.toISOString(), at) : null;
}
