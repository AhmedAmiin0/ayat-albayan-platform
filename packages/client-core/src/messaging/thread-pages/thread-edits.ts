import type { MessageView, ThreadDetail } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';

// The cache edits an open chat makes (web and mobile): an optimistic send's row, the API's row in
// its place, a rollback, and a fresh newest page folded in. pages[0] is the newest page.

type Edit = (messages: MessageView[], index: number) => MessageView[];

function mapMessages<T extends ThreadPages>(data: T | undefined, edit: Edit): T | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p, i) => ({ ...p, messages: edit(p.messages, i) })) };
}

/** Each id once, the first copy kept (the server row may land before the provisional one goes). */
const once = (messages: MessageView[]): MessageView[] =>
  messages.filter((m, i) => messages.findIndex((x) => x.id === m.id) === i);

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

/**
 * A fresh newest page folded into pages[0] (older pages untouched, so nothing shifts): its rows
 * win; older rows it no longer covers stay before them, rows it does not know yet (a send still in
 * flight, an answer that came back first) stay after them, so a refetch never drops a provisional
 * row.
 */
export function mergeNewest<T extends ThreadPages>(
  data: T | undefined,
  fresh: ThreadDetail,
): T | undefined {
  const head = data?.pages[0];
  if (!data || !head) return data;
  const ids = new Set(fresh.messages.map((m) => m.id));
  const from = at(fresh.messages[0]);
  const rest = head.messages.filter((m) => !ids.has(m.id));
  const before = rest.filter((m) => at(m) < from);
  const after = rest.filter((m) => at(m) >= from);
  const messages = [...before, ...fresh.messages, ...after];
  const page = { ...fresh, messages, has_more: before.length > 0 ? head.has_more : fresh.has_more };
  return { ...data, pages: [page, ...data.pages.slice(1)] };
}

/** More new rows than one page since the last read: merging would hide the ones in between. */
export function leavesGap(data: ThreadPages | undefined, fresh: ThreadDetail): boolean {
  const cached = new Set(data?.pages[0]?.messages.map((m) => m.id));
  return fresh.has_more && cached.size > 0 && !fresh.messages.some((m) => cached.has(m.id));
}
