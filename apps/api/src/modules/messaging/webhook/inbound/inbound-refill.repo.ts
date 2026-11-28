import type { TablesInsert } from '@ab/db';
import type { Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';
import { refillPatch } from './inbound-refill';

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
  if (error) throw pgError(error, { otherwise: (e) => new Error(`db: ${e.message}`) });
  return data.length > 0;
}
