import type { TablesInsert, TablesUpdate } from '@ab/db';
import { isUnsupportedMessage } from '@ab/shared';
import type { Db } from '../../../../common/db/db.module';

// Meta's `unsupported` (131060 «This message is unavailable»: often a new number's first message
// while the chat line runs in coexistence) stores a row with no content. If Meta later re-sends
// that wamid with the real content, the row takes it in place; every other replay stays a no-op.

/** The content columns a re-sent wamid fills in; null when the new event is still `unsupported`. */
export function refillPatch(row: TablesInsert<'messages'>): TablesUpdate<'messages'> | null {
  if (isUnsupportedMessage(row.interactive_payload)) return null;
  return {
    body: row.body ?? null,
    media_id: row.media_id ?? null,
    media_mime: row.media_mime ?? null,
    interactive_payload: row.interactive_payload ?? null,
    reply_to_wa_id: row.reply_to_wa_id ?? null,
  };
}

/**
 * Compare-and-set: only the inbound row of that wamid whose stored payload is still `unsupported`
 * (so it runs once, and a normal message is never overwritten). No push, lead or follow-up here:
 * the caller still treats the event as a replay.
 */
export async function refillUnsupported(db: Db, row: TablesInsert<'messages'>): Promise<boolean> {
  const patch = refillPatch(row);
  if (!patch || !row.wa_message_id) return false;
  const { data, error } = await db
    .from('messages')
    .update(patch)
    .eq('wa_message_id', row.wa_message_id)
    .eq('direction', 'inbound')
    .eq('interactive_payload->>type', 'unsupported')
    .select('id');
  if (error) throw new Error(`db: ${error.message}`);
  return (data ?? []).length > 0;
}
