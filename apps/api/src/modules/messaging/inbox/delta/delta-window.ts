import type { MessageView, ThreadDeltaWindow, ThreadView } from '@ab/shared';

/** The chat's window for the delta; `cleared` (a teacher, or rows just stamped) shows 0 unread. */
export const windowOf = (v: ThreadView, cleared: boolean): ThreadDeltaWindow => ({
  last_inbound_at: v.last_inbound_at,
  session_open: v.session_open,
  unread_count: cleared ? 0 : v.unread_count,
  reply_line: v.reply_line ?? null,
  last_inbound_line: v.last_inbound_line ?? null,
  last_chat_inbound_at: v.last_chat_inbound_at ?? null,
  last_notifications_inbound_at: v.last_notifications_inbound_at ?? null,
});

export const readNow = (views: MessageView[], at: Date): MessageView[] =>
  views.map((m) =>
    m.direction === 'inbound' && !m.read_at ? { ...m, read_at: at.toISOString() } : m,
  );

/**
 * A gap only when the rows past the limit are newer than `after` (the overlap alone never forces
 * a full read).
 */
export const hasGap = (
  rows: readonly { created_at: string }[],
  q: { limit: number; after: string },
): boolean =>
  rows.length > q.limit && Date.parse(rows[q.limit]?.created_at ?? '') > Date.parse(q.after);
