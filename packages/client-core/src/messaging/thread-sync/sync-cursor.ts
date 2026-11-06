import { rewindSyncCursor, syncCursorSchema, type SyncCursor } from '@ab/shared';

/** What the phone keeps between syncs (its sync_state row). */
export interface SyncState {
  /** The high-water mark: the newest row ever scanned; null before the first sync. */
  cursor: string | null;
  /** The last page was full: the next ask continues from `cursor` without the overlap. */
  more: boolean;
  /** The server's scope key of the rows held; another key means wipe and resync. */
  scope: string | null;
}

export const EMPTY_SYNC: SyncState = { cursor: null, more: false, scope: null };

/** Microseconds since the epoch: Postgres keeps six digits, Date only three. */
export function stampMicros(at: string): bigint {
  const frac = /\.(\d+)/.exec(at)?.[1] ?? '';
  const micro = BigInt(frac.padEnd(6, '0').slice(3, 6));
  return BigInt(Date.parse(at)) * 1000n + micro;
}

/** -1 / 0 / 1 by (updated_at, id): the server's keyset order. */
export function compareCursors(a: SyncCursor, b: SyncCursor): number {
  const da = stampMicros(a.at);
  const db = stampMicros(b.at);
  const byTime = Number(da > db) - Number(da < db);
  return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
}

const parsed = (cursor: string): SyncCursor => syncCursorSchema.parse(cursor);

/** The later of two cursors (a re-asked overlap never moves the mark back). */
export function laterCursor(held: string | null, got: string | null): string | null {
  if (held === null || got === null) return got ?? held;
  return compareCursors(parsed(got), parsed(held)) > 0 ? got : held;
}

/**
 * The `since` of the next ask: none on the first sync; the mark itself while pages are full; else
 * the mark rewound by SYNC_OVERLAP_MS (rows a slower transaction committed after a newer one).
 */
export function nextSince(state: SyncState): string | undefined {
  if (state.cursor === null) return undefined;
  return state.more ? state.cursor : rewindSyncCursor(state.cursor);
}
