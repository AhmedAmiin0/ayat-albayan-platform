import { isUnsupportedMessage } from '@ab/shared';
import type { Db } from '../../../../common/db/db.module';
import type { ThreadRow } from './threads.mapper';

/** A v_threads row, and whether its last message is Meta's `unsupported` (no content arrived). */
export type ListedThreadRow = ThreadRow & { last_unsupported?: boolean };

/** Only an inbound row with no text, file or template can be one; the view does not carry the payload. */
const empty = (r: ThreadRow) => r.last_direction === 'inbound' && !r.last_body && !r.last_media_mime && !r.last_template_key;

/**
 * The chats list words such a row «رسالة لم يصل محتواها» (owner 2026-10-27, Meta's 131060): one
 * read by pk for the page's empty last messages, none when there is no such row.
 */
export async function markUnsupported(db: Db, rows: readonly ThreadRow[]): Promise<ListedThreadRow[]> {
  const ids = rows.flatMap((r) => (empty(r) && r.last_message_id ? [r.last_message_id] : []));
  if (ids.length === 0) return [...rows];
  const { data, error } = await db.from('messages').select('id, interactive_payload').in('id', ids);
  if (error) throw new Error(`last messages read failed: ${error.message}`);
  const hit = new Set((data ?? []).flatMap((m) => (isUnsupportedMessage(m.interactive_payload) ? [m.id] : [])));
  return rows.map((r) => (r.last_message_id && hit.has(r.last_message_id) ? { ...r, last_unsupported: true } : r));
}
