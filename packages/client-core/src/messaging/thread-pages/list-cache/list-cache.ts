import type { MessageView, ThreadView } from '@ab/shared';
import type { MessageStatus } from '@ab/catalog';
import { patchList } from '../../inbox';
import { touchedThread } from '../provisional';
import type { ListPage, ListPages } from './list-cache.types';

// The chats list's cache edits (GET /threads, an infinite query: pages[0] is the newest page).
// Each returns the same object when nothing changes, so an unchanged list never re-renders.

const time = (th: ThreadView) => Date.parse(th.last_message_at);
const newestFirst = (a: ThreadView, b: ThreadView) => time(b) - time(a);

const withPages = <D extends ListPages>(data: D, pages: D['pages']): D =>
  pages.every((p, i) => p === data.pages[i]) ? data : { ...data, pages };

/** Every page with `edit` applied to each row; the same pages when no row changes. */
function mapRows<D extends ListPages>(data: D, edit: (th: ThreadView) => ThreadView): D {
  const pages = data.pages.map((p) => {
    const items = p.items.map(edit);
    return items.every((th, i) => th === p.items[i]) ? p : { ...p, items };
  });
  return withPages(data, pages);
}

/** `rows` first on the newest page, their phones out of every page (WhatsApp's order). */
export function moveToTop<D extends ListPages>(data: D, rows: readonly ThreadView[]): D {
  if (rows.length === 0) return data;
  const moved = new Set(rows.map((th) => th.phone_e164));
  const pages = data.pages.map((p, i) => {
    const items = p.items.filter((th) => !moved.has(th.phone_e164));
    return { ...p, items: i === 0 ? [...rows, ...items] : items };
  });
  return { ...data, pages };
}

/** The row with the stored row's last message, its time and unread count. */
const previewOf = (th: ThreadView, held: ThreadView): ThreadView => ({
  ...th,
  last_message_id: held.last_message_id,
  last_direction: held.last_direction,
  last_body: held.last_body,
  last_template_key: held.last_template_key,
  last_status: held.last_status,
  last_media_mime: held.last_media_mime,
  last_unsupported: held.last_unsupported ?? false,
  last_message_at: held.last_message_at,
  last_inbound_at: held.last_inbound_at,
  unread_count: held.unread_count,
});

/**
 * The phone store ahead of the cached list (a message received since the list's read): each row
 * the store holds with a later last message takes its preview and goes to the top, newest first.
 * A chat the list does not hold waits for its read (the list's filters decide whether it shows).
 */
export function withStoredThreads<D extends ListPages>(
  data: D,
  stored: ReadonlyMap<string, ThreadView>,
): D {
  const newer = (th: ThreadView) => {
    const held = stored.get(th.phone_e164);
    return held !== undefined && time(held) > time(th) ? previewOf(th, held) : null;
  };
  const lifted = data.pages.flatMap((p) => p.items.flatMap((th) => newer(th) ?? []));
  return moveToTop(data, lifted.sort(newestFirst));
}

const holdsAll = (p: ListPage) => p.page * p.pageSize >= p.total;

/** A full fresh page sharing no row with the cache: rows between them are unknown. */
function leavesGap(data: ListPages, fresh: ListPage): boolean {
  const cached = new Set(data.pages.flatMap((p) => p.items.map((th) => th.phone_e164)));
  const overlaps = fresh.items.some((th) => cached.has(th.phone_e164));
  return cached.size > 0 && !overlaps && !holdsAll(fresh);
}

/**
 * A fresh page 1 in place of the cached one; the other pages untouched (the list's items keep a
 * phone's first row). A row the fresh page pushed down stays after it until its page is read
 * again. Null on a gap: every page must be read again.
 */
export function mergeListHead<D extends ListPages>(
  data: D | undefined,
  fresh: D['pages'][number],
): D | null | undefined {
  if (!data) return data;
  if (leavesGap(data, fresh)) return null;
  const [head, ...older] = data.pages;
  const phoneOf = (th: ThreadView) => th.phone_e164;
  const kept = new Set([...fresh.items, ...older.flatMap((p) => p.items)].map(phoneOf));
  const below = (head?.items ?? []).filter((th) => !kept.has(th.phone_e164));
  const pushed = holdsAll(fresh) ? [] : below;
  return { ...data, pages: [{ ...fresh, items: [...fresh.items, ...pushed] }, ...older] };
}

/** The API's row in place of a send's provisional one (its id, status and time). */
export function replaceListRow<D extends ListPages>(
  data: D | undefined,
  provisionalId: string,
  row: MessageView,
): D | undefined {
  const swap = (th: ThreadView) =>
    th.last_message_id === provisionalId ? touchedThread(th, row) : th;
  return data && mapRows(data, swap);
}

/** An event's ticks on every cached page (patchList); the same object when none moves. */
export function patchListPages<D extends ListPages>(
  data: D,
  incoming: ReadonlyMap<string, MessageStatus>,
): D {
  return withPages(
    data,
    data.pages.map((p) => patchList(p, incoming)),
  );
}
