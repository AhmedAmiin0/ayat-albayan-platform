import type { MessageView, ThreadDelta } from '@ab/shared';
import type { ThreadCache } from './thread-cache';

// Whether the open chat's last delta brought anything (docs/43 AU5, review of #673). A realtime
// event runs the delta first; a delta with nothing new means the change is one a delta never
// carries (a tick on a row older than the pending window, a customer's reaction, a hide), so
// the event then re-reads the newest page (refreshOpenChat).

const news = new Map<string, boolean>();
const signature = (m: MessageView) => JSON.stringify(m);

/** Records whether `delta` holds a row the cache lacks or holds differently. */
export function noteDelta(phone: string, cache: ThreadCache | undefined, delta: ThreadDelta): void {
  const rows = cache?.pages.flatMap((p) => p.messages) ?? [];
  const held = new Map(rows.map((m) => [m.id, signature(m)]));
  const fresh = [...delta.messages, ...delta.pending];
  news.set(phone, fresh.some((m) => held.get(m.id) !== signature(m)));
}

/** Forgets the last answer: the next delta of this chat records afresh. */
export const forgetDelta = (phone: string): void => void news.delete(phone);

/** The last delta answered and brought nothing (unknown → false: no extra read). */
export const deltaWasEmpty = (phone: string): boolean => news.get(phone) === false;
