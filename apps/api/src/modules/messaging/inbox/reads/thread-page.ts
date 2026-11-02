import type { MessageView, ThreadView } from '@ab/shared';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp';
import type { ReadReceipts } from './read-receipts';
import type { KnownNumber } from '@/modules/messaging/inbox/threads/known-number';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import type { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';

/** GET /threads/:phone's page: `before` = created_at of the oldest loaded message (the page before it). */
export interface ThreadPageQuery {
  phone: string;
  before?: string;
  limit: number;
}

/** Where a page comes from: the thread row and who a phone is, and the phone's messages. */
interface PageRepos {
  threads: Pick<ThreadsRepo, 'thread' | 'known'>;
  messages: Pick<ThreadMessagesRepo, 'messages'>;
}

interface PageRows {
  found: ThreadRow | null;
  /** The thread row, else (first page of a number with no message yet) who the number is. */
  who: ThreadRow | KnownNumber | null;
  /** Newest first, `limit + 1` rows (ThreadMessagesRepo.messages). */
  rows: ThreadMessageRow[];
}

/**
 * Stage 1 of an open chat (admin and sales): the thread row and the page side by side. A number
 * with no message yet (a booked family, «محادثة جديدة»): who it is, so the first template can name
 * its lesson.
 */
export async function pageRows(repos: PageRepos, q: ThreadPageQuery): Promise<PageRows> {
  const { threads, messages } = repos;
  const [found, rows] = await Promise.all([threads.thread(q.phone), messages.messages(q)]);
  const who = found ?? (q.before ? null : await threads.known(q.phone));
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
