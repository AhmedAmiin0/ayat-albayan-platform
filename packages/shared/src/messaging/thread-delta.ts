import type { MessageView } from './chat/message-view';

/** Outbound rows this young still change status (queued → sent → delivered → read). */
export const PENDING_WINDOW_MS = 30 * 60_000;
/** At most this many `pending` ids per request. */
export const PENDING_IDS_MAX = 20;
/** WhatsApp stamps inbound rows with the sender's own second, which can land just before our newest row: the client asks again for this overlap. */
export const DELTA_OVERLAP_MS = 2 * 60_000;

const MOVING: ReadonlySet<string> = new Set(['queued', 'sent', 'delivered']);

/** An outbound row a delta should re-read: still moving and young enough (failed / read never move again). */
export function isPendingMessage(
  m: Pick<MessageView, 'direction' | 'status' | 'created_at'>,
  now: number,
): boolean {
  return (
    m.direction === 'outbound' &&
    MOVING.has(m.status) &&
    now - Date.parse(m.created_at) < PENDING_WINDOW_MS
  );
}
