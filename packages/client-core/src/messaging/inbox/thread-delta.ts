import { isPendingMessage, PENDING_IDS_MAX, type MessageView, type ThreadDelta, type ThreadDetail } from '@ab/shared';

/** An open chat's cache (TanStack's InfiniteData<ThreadDetail>): pages[0] is the newest page. */
export interface ThreadPages {
  pages: ThreadDetail[];
  pageParams: unknown[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const time = (m: MessageView) => Date.parse(m.created_at);

/**
 * The delta request's query string for this cache: `after` = the newest row held, `pending` = the
 * outgoing rows whose status may still move (newest PENDING_IDS_MAX). null = nothing to anchor on
 * (no page, or an empty chat): the caller does a full read instead.
 */
export function deltaSearch(data: ThreadPages | undefined, now: number): string | null {
  const head = data?.pages[0];
  if (!data || !head || head.messages.length === 0) return null;
  const newest = Math.max(...head.messages.map(time));
  if (!Number.isFinite(newest)) return null;
  const params = new URLSearchParams({ after: new Date(newest).toISOString() });
  const moving = data.pages.flatMap((p) => p.messages).filter((m) => UUID.test(m.id) && isPendingMessage(m, now));
  const ids = [...new Set(moving.map((m) => m.id))].slice(-PENDING_IDS_MAX);
  if (ids.length > 0) params.set('pending', ids.join(','));
  return `?${params}`;
}

/**
 * A delta folded into the cache: rows it carries replace the cached ones by id on every page (a status
 * moved, a quote arrived), rows the cache does not know join the newest page in time order, and a new
 * inbound row's window lands on pages[0].thread. Older pages never shift. A delta with `has_more` must
 * not be merged (rows in between would be missing): re-read the thread instead (needsFullRead).
 */
export function mergeDelta<T extends ThreadPages>(data: T | undefined, delta: ThreadDelta): T | undefined {
  const head = data?.pages[0];
  if (!data || !head) return data;
  const fresh = new Map([...delta.pending, ...delta.messages].map((m) => [m.id, m]));
  const known = new Set(data.pages.flatMap((p) => p.messages.map((m) => m.id)));
  const added = delta.messages.filter((m) => !known.has(m.id));
  const pages = data.pages.map((p) => ({ ...p, messages: p.messages.map((m) => fresh.get(m.id) ?? m) }));
  const first = pages[0] ?? head;
  const messages = [...first.messages, ...added].sort((a, b) => time(a) - time(b));
  const thread = first.thread && delta.thread ? { ...first.thread, ...delta.thread } : first.thread;
  return { ...data, pages: [{ ...first, messages, thread }, ...pages.slice(1)] };
}

/** More new rows than one delta: merging would hide the ones in between. */
export const needsFullRead = (delta: ThreadDelta): boolean => delta.has_more;
