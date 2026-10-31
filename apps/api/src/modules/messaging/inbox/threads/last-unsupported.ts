import { adWelcomeOf, isUnsupportedMessage, messageNote, type ThreadNote } from '@ab/shared';
import type { Db } from '@/common/db/db.module';
import type { ThreadRow } from './threads.mapper';

/** A v_threads row, and what its last message shows instead of its content (absent = itself). */
export type ListedThreadRow = ThreadRow & ThreadNote & { last_unsupported?: boolean };

interface LastRow {
  id: string;
  direction: ThreadRow['last_direction'];
  interactive_payload: unknown;
  deleted_at: string | null;
}

/** Only an inbound row with no text, file or template can be Meta's «content never arrived». */
const empty = (r: ThreadRow) =>
  r.last_direction === 'inbound' && !r.last_body && !r.last_media_mime && !r.last_template_key;

/** The row as the list shows it: a note replaces the text and the file (deleted rows keep both). */
function noted(r: ThreadRow, m: LastRow | undefined): ListedThreadRow {
  if (!m) return r;
  const note = m.direction
    ? messageNote({ ...m, direction: m.direction, deleted: !!m.deleted_at })
    : null;
  if (note) {
    const body = note === 'ad_welcome' ? adWelcomeOf(m.interactive_payload) : null;
    return {
      ...r,
      last_note: note,
      last_body: body,
      last_media_mime: null,
      last_template_key: null,
    };
  }
  return empty(r) && isUnsupportedMessage(m.interactive_payload)
    ? { ...r, last_unsupported: true }
    : r;
}

/**
 * The chats list's words for a last message that does not show its own content: Meta's 131060
 * «رسالة لم يصل محتواها» (owner 2026-10-27), and (owner 2026-10-30) a message deleted for
 * everyone, the ad's automatic welcome or an unsupported echo (marker-notes.ts). One read by pk
 * for the page's last messages (a deleted one keeps its body, so any row can be one).
 */
export async function markUnsupported(
  db: Db,
  rows: readonly ThreadRow[],
): Promise<ListedThreadRow[]> {
  const ids = rows.flatMap((r) => (r.last_message_id ? [r.last_message_id] : []));
  if (ids.length === 0) return [...rows];
  const { data, error } = await db
    .from('messages')
    .select('id, direction, interactive_payload, deleted_at')
    .in('id', ids);
  if (error) throw new Error(`last messages read failed: ${error.message}`);
  const byId = new Map((data ?? []).map((m) => [m.id, m]));
  return rows.map((r) => noted(r, r.last_message_id ? byId.get(r.last_message_id) : undefined));
}
