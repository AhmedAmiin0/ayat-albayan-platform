import type { TablesInsert, TablesUpdate } from '@ab/db';
import { isUnsupportedMessage } from '@ab/shared';

// Meta's `unsupported` (131060 «This message is unavailable»: often a new number's first message
// while the chat line runs in coexistence) stores a row with no content. If Meta later re-sends
// that wamid with the real content, the row takes it in place; every other replay stays a no-op.

/** An insert's absent column is stored as null: the patch clears what the new event lacks. */
const orNull = <T>(value: T | undefined): T | null => value ?? null;

/** The content columns a re-sent wamid fills in; null when the new event is still `unsupported`. */
export function refillPatch(row: TablesInsert<'messages'>): TablesUpdate<'messages'> | null {
  if (isUnsupportedMessage(row.interactive_payload)) return null;
  return {
    body: orNull(row.body),
    media_id: orNull(row.media_id),
    media_mime: orNull(row.media_mime),
    interactive_payload: orNull(row.interactive_payload),
    reply_to_wa_id: orNull(row.reply_to_wa_id),
  };
}
