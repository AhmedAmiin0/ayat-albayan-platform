import type { NotificationItem } from '@ab/shared';
import type { Tables } from '@ab/db';

type Row = Pick<Tables<'push_notifications'>, 'id' | 'kind' | 'title' | 'body' | 'data' | 'created_at' | 'read_at'>;

/** push_notifications.data is jsonb: only its string fields reach the client (they are all strings when we write them). */
export function notificationItem(row: Row): NotificationItem {
  const data: Record<string, string> = {};
  if (row.data !== null && typeof row.data === 'object' && !Array.isArray(row.data)) {
    for (const [k, v] of Object.entries(row.data)) if (typeof v === 'string') data[k] = v;
  }
  return { id: row.id, kind: row.kind, title: row.title, body: row.body, data, created_at: row.created_at, read_at: row.read_at };
}
