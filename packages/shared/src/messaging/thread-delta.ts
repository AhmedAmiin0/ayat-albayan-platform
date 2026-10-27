import type { MessageView, ThreadView } from './chat/views.js';

/**
 * GET /threads/:phone?after=<ISO>&pending=<id,…> (owner 2026-10-27, «delta refresh»): what changed in
 * an open chat since the newest row the client holds, in ~2 reads instead of a whole page (~10).
 */
export interface ThreadDelta {
  /** Rows created after `after`, oldest → newest; at most `limit`. */
  messages: MessageView[];
  /** More than `limit` newer rows: merging would leave a gap, so the client re-reads the whole thread. */
  has_more: boolean;
  /**
   * Outgoing rows whose status may still move, as they are now: the ids the client passed (this chat's
   * only) and the chat's outbound rows queued / sent / delivered in the last PENDING_WINDOW_MS.
   */
  pending: MessageView[];
  /** Only when a new inbound row arrived: the window and the unread count moved. Absent otherwise. */
  thread?: ThreadDeltaWindow;
}

/** The thread fields a new inbound row changes (the 24 h window, its reply line, the unread count). */
export type ThreadDeltaWindow = Pick<
  ThreadView,
  'last_inbound_at' | 'session_open' | 'unread_count' | 'reply_line' | 'last_inbound_line' | 'last_chat_inbound_at' | 'last_notifications_inbound_at'
>;

/** Outbound rows this young still change status (queued → sent → delivered → read). */
export const PENDING_WINDOW_MS = 30 * 60_000;
/** At most this many `pending` ids per request. */
export const PENDING_IDS_MAX = 20;
/** WhatsApp stamps inbound rows with the sender's own second, which can land just before our newest row: the client asks again for this overlap. */
export const DELTA_OVERLAP_MS = 2 * 60_000;

const MOVING: ReadonlySet<string> = new Set(['queued', 'sent', 'delivered']);

/** An outbound row a delta should re-read: still moving and young enough (failed / read never move again). */
export function isPendingMessage(m: Pick<MessageView, 'direction' | 'status' | 'created_at'>, now: number): boolean {
  return m.direction === 'outbound' && MOVING.has(m.status) && now - Date.parse(m.created_at) < PENDING_WINDOW_MS;
}
