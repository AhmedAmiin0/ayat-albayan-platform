import type { MessageView, ThreadDetail } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';
import { laterRow } from './later-row.js';

// The cache edits an open chat makes (web and mobile): an optimistic send's row, the API's row in
// its place, a rollback, and a fresh newest page folded in. pages[0] is the newest page.

type Edit = (messages: MessageView[], index: number) => MessageView[];

function mapMessages<T extends ThreadPages>(data: T | undefined, edit: Edit): T | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p, i) => ({ ...p, messages: edit(p.messages, i) })) };
}

/**
 * Each id once, at its first place (the server row may land before the provisional one goes),
 * holding the copy furthest along (laterRow): the POST's queued answer never undoes a newer tick.
 */
function once(messages: MessageView[]): MessageView[] {
  const kept = new Map<string, MessageView>();
  for (const m of messages) kept.set(m.id, kept.has(m.id) ? laterRow(kept.get(m.id) ?? m, m) : m);
  return [...kept.values()];
}

/** Puts a just-sent row at the end of the newest page. */
export function appendMessage<T extends ThreadPages>(
  data: T | undefined,
  row: MessageView,
): T | undefined {
  return mapMessages(data, (messages, i) => (i === 0 ? [...messages, row] : messages));
}

/**
 * Swaps the row with this id (the provisional one, or a retried one) for the server's row; when a
 * refresh already brought the server row in, the page keeps one copy (no double bubble).
 */
export function replaceMessage<T extends ThreadPages>(
  data: T | undefined,
  id: string,
  row: MessageView,
): T | undefined {
  return mapMessages(data, (messages) => once(messages.map((m) => (m.id === id ? row : m))));
}

/** Rollback of a send the API refused. */
export function removeMessage<T extends ThreadPages>(
  data: T | undefined,
  id: string,
): T | undefined {
  return mapMessages(data, (messages) => messages.filter((m) => m.id !== id));
}

const at = (m: Pick<MessageView, 'created_at'> | undefined): number =>
  Date.parse(m?.created_at ?? '') || -Infinity;

/** Which of two copies of one message the chat keeps. */
export type RowPick = (held: MessageView, incoming: MessageView) => MessageView;

/** The fresh copy always: for a read that is the newest truth (docs/43 43-1). */
export const freshRow: RowPick = (_held, incoming) => incoming;

/**
 * A fresh newest page folded into pages[0] (older pages untouched, so nothing shifts): its rows
 * win; older rows it no longer covers stay before them, rows it does not know yet (a send still in
 * flight, an answer that came back first) stay after them, so a refetch never drops a provisional
 * row. `pick` chooses between a held copy and the fresh one (default laterRow: an older answer from
 * two quick sends never sets a newer tick back); a read known to be the newest passes `freshRow`.
 */
export function mergeNewest<T extends ThreadPages>(
  data: T | undefined,
  fresh: ThreadDetail,
  pick: RowPick = laterRow,
): T | undefined {
  const head = data?.pages[0];
  if (!data || !head) return data;
  const held = new Map(head.messages.map((m) => [m.id, m]));
  const from = at(fresh.messages[0]);
  const rest = head.messages.filter((m) => !fresh.messages.some((f) => f.id === m.id));
  const before = rest.filter((m) => at(m) < from);
  const after = rest.filter((m) => at(m) >= from);
  const rows = fresh.messages.map((m) => pick(held.get(m.id) ?? m, m));
  const messages = [...before, ...rows, ...after];
  const page = { ...fresh, messages, has_more: before.length > 0 ? head.has_more : fresh.has_more };
  return { ...data, pages: [page, ...data.pages.slice(1)] };
}

/** The newest page's rows ([] when nothing is loaded). */
const newestRows = (data: ThreadPages | undefined): MessageView[] => data?.pages[0]?.messages ?? [];

/**
 * More new rows than one page since the last read: merging would hide the ones in between. Rows in
 * `skip` (this device's own sends: they are in both) prove no overlap; a held page with nothing
 * else to compare is a gap whenever the fresh page has more behind it.
 */
export function leavesGap(
  data: ThreadPages | undefined,
  fresh: ThreadDetail,
  skip: ReadonlySet<string> = new Set(),
): boolean {
  const head = newestRows(data);
  const cached = new Set(head.map((m) => m.id).filter((id) => !skip.has(id)));
  const overlaps = fresh.messages.some((m) => cached.has(m.id));
  return fresh.has_more && head.length > 0 && !overlaps;
}
