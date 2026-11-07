import type { MessageStatus } from '@ab/shared';
import { ranksAbove } from './later-status.js';

// docs/44 K1 on a store that a sync also writes (mobile SQLite): a realtime event is a visual patch
// over a row the server may have moved since. A late event must never undo a synced failure, and
// the sync skips a row whose stamp it already holds, so nothing would correct it. The patch moves
// a stored tick only FORWARD along queued < sent < delivered < read; it lands failed /
// sent_manually only when the event is newer than the stored row's server stamp. Reads stay the
// truth (they replace the row as the server sent it).

/** A stored tick and its row's server stamp (updated_at; undefined when the store has no row). */
interface StoredTick {
  status: MessageStatus;
  stamp?: string | undefined;
}

/** What an event tells about one row: its status (s) and its time (at). */
interface TickEvent {
  s: MessageStatus;
  at: string;
}

const UNRANKED = new Set<MessageStatus>(['failed', 'sent_manually']);

/** The event is later than the stored stamp (an unknown or unreadable time never is). */
const newerThan = (at: string, stamp: string | undefined) =>
  Date.parse(at) > Date.parse(stamp ?? '');

/** The event settles the row (failed / by hand) and is newer than what the store holds. */
const settles = (stored: StoredTick, event: TickEvent) =>
  UNRANKED.has(event.s) && newerThan(event.at, stored.stamp);

/** The tick to store for `stored` after `event`: forward only, or a newer settling status. */
export function liveTick(stored: StoredTick, event: TickEvent): MessageStatus {
  const moves = ranksAbove(event.s, stored.status) || settles(stored, event);
  return moves ? event.s : stored.status;
}
