import type { WaLine } from '@ab/shared';

/** One read receipt to send: the newest unread inbound wamid of one line (docs/12 §13.7). */
export interface ReadMark {
  waMessageId: string;
  line: WaLine;
}

type InboundRead = { wa_message_id: string | null; created_at: string; line: WaLine | null };

/**
 * The newest unread inbound per line. A wamid only works with the receiving line's token, so each
 * line gets its own receipt. A null line is history (or single-line) and belongs to notifications;
 * a row without a wamid cannot be acknowledged and is skipped.
 */
export function newestPerLine(rows: readonly InboundRead[]): ReadMark[] {
  const newest = new Map<WaLine, { waMessageId: string; at: string }>();
  for (const row of rows) {
    if (!row.wa_message_id) continue;
    const line = row.line ?? 'notifications';
    const seen = newest.get(line);
    if (!seen || row.created_at > seen.at) newest.set(line, { waMessageId: row.wa_message_id, at: row.created_at });
  }
  return [...newest].map(([line, m]) => ({ waMessageId: m.waMessageId, line }));
}
