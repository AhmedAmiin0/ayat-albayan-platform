import type { MessageStatus } from '@ab/shared';
import { type ChatPages, ranksAbove } from './later-status.js';

// docs/43 §2 (the owner's pending tick): the chat merges its statuses (delta, page poll) while a
// list read that started earlier can still answer `queued`. The list row takes the chat's status
// for the SAME last message when it is further along; a list read never lowers it.

/** The fields of a chats-list row (ThreadView) a tick needs. */
export interface TickRow {
  phone_e164: string;
  last_message_id: string;
  last_status: MessageStatus;
}

/** The status a chat cache holds for this row's last message; undefined when not loaded. */
export type StatusOf = (row: TickRow) => MessageStatus | undefined;

/** The status of message `id` in a chat cache (the newest page's copy first). */
export function chatStatus(cache: ChatPages | undefined, id: string): MessageStatus | undefined {
  return cache?.pages.flatMap((p) => p.messages).find((m) => m.id === id)?.status;
}

const ahead = (status: MessageStatus | undefined, row: TickRow): status is MessageStatus =>
  status !== undefined && ranksAbove(status, row.last_status);

const lifted = <T extends TickRow>(row: T, status: MessageStatus | undefined): T =>
  ahead(status, row) ? { ...row, last_status: status } : row;

/** The rows with every tick the chats hold further along; the same array when none moves. */
export function overlayTicks<T extends TickRow>(items: T[], statusOf: StatusOf): T[] {
  const out = items.map((row) => lifted(row, statusOf(row)));
  return out.every((row, i) => row === items[i]) ? items : out;
}

/** One list page ({ items }) overlaid; the same object when no tick moves. */
export function overlayPage<P extends { items: TickRow[] }>(page: P, statusOf: StatusOf): P {
  const items = overlayTicks(page.items, statusOf);
  return items === page.items ? page : { ...page, items };
}

/** An infinite list cache ({ pages }) overlaid page by page; the same object when no tick moves. */
export function overlayPages<D extends { pages: { items: TickRow[] }[] }>(
  data: D,
  statusOf: StatusOf,
): D {
  const pages = data.pages.map((p) => overlayPage(p, statusOf));
  return pages.every((p, i) => p === data.pages[i]) ? data : { ...data, pages };
}
