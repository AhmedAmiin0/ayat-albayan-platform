import type { MessageView, ThreadView } from '@ab/shared';
import type { ThreadMessageRow } from '../../whatsapp/messages/message.mapper';
import type { ReadReceipts } from './read-receipts';
import type { KnownNumber } from '../threads/known-number';
import type { ThreadRow } from '../threads/threads.mapper';
import type { ThreadsQueries } from '../threads/threads.queries';

/** GET /threads/:phone's page: `before` = created_at of the oldest loaded message (the page before it). */
export interface ThreadPageQuery {
  phone: string;
  before?: string;
  limit: number;
}

interface PageRows {
  found: ThreadRow | null;
  /** The thread row, else (first page of a number with no message yet) who the number is. */
  who: ThreadRow | KnownNumber | null;
  /** Newest first, `limit + 1` rows (ThreadsQueries.messages). */
  rows: ThreadMessageRow[];
}

/**
 * Stage 1 of an open chat (admin and sales): the thread row and the page side by side. A number with no
 * message yet (a booked family, «محادثة جديدة»): who it is, so the first template can name its lesson.
 */
export async function pageRows(queries: ThreadsQueries, q: ThreadPageQuery): Promise<PageRows> {
  const [found, rows] = await Promise.all([queries.thread(q.phone), queries.messages(q)]);
  const who = found ?? (q.before ? null : await queries.known(q.phone));
  return { found, who, rows };
}

/**
 * The first page's read stamp, only when the thread has unread rows (a poll of a read chat writes
 * nothing), up to the newest row shown. Meta's receipt goes out in the background (ReadReceipts).
 */
export async function stampRead(receipts: ReadReceipts, input: { q: ThreadPageQuery; page: PageRows; now: Date }): Promise<boolean> {
  const { q, page, now } = input;
  if (q.before || !page.found || page.found.unread_count === 0) return false;
  return (await receipts.open(q.phone, { now, upTo: page.rows[0]?.created_at })).stamped;
}

/** After a stamp, the answer reads as if stamped first: 0 unread, the page's inbound rows read now. */
export function asRead<T extends { thread: ThreadView | null; messages: MessageView[] }>(detail: T, at: Date): T {
  const readAt = at.toISOString();
  return {
    ...detail,
    thread: detail.thread ? { ...detail.thread, unread_count: 0 } : null,
    messages: detail.messages.map((m) => (m.direction === 'inbound' && !m.read_at ? { ...m, read_at: readAt } : m)),
  };
}
