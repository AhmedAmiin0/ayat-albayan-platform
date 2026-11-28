import type { Db } from '@/common/db/db.module';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import { noted, type ListedThreadRow } from './last-unsupported';
import { check } from '@/modules/messaging/inbox/threads/store/check';

/** One read by pk of the page's last messages, since a deleted one keeps its body. */
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
  check(error, 'last messages read');
  const byId = new Map(data.map((m) => [m.id, m]));
  return rows.map((r) => noted(r, r.last_message_id ? byId.get(r.last_message_id) : undefined));
}
