import { compareCursors, type SyncMessage, type ThreadSync, type ThreadView } from '@ab/shared';
import { laterCursor, type SyncState } from './sync-cursor.js';

/** What one sync answer asks the store to do (the SQLite engine runs it in one transaction). */
export interface SyncPlan {
  /** Wipe every row first: the caller's scope changed (role, chats, hidden numbers). */
  reset: boolean;
  /** Rows to insert or replace by id: only those newer than the stored copy. */
  upsert: SyncMessage[];
  /** Ids to delete (tombstones). */
  remove: string[];
  /** Thread rows to insert or replace by phone. */
  threads: ThreadView[];
  /** The sync_state to store with them. */
  state: SyncState;
}

/** The stored row's updated_at by id; undefined when the store does not hold it. */
export type HeldStamp = (id: string) => string | undefined;

const stampOf = (m: SyncMessage) => ({ at: m.updated_at, id: m.id });

/** Newer than what the store holds (equal is skipped: an overlap re-read is a no-op). */
const isNewer = (m: SyncMessage, held: string | undefined): boolean =>
  held === undefined || compareCursors(stampOf(m), { at: held, id: m.id }) > 0;

/** One row per id, the latest copy (a page never repeats one, but two merged answers can). */
function latestById(rows: readonly SyncMessage[]): SyncMessage[] {
  const out = new Map<string, SyncMessage>();
  for (const m of rows) {
    const seen = out.get(m.id);
    out.set(m.id, seen && !isNewer(m, seen.updated_at) ? seen : m);
  }
  return [...out.values()];
}

/** Idempotent: applying the same answer twice plans nothing the second time but the cursor. */
export function planSync(state: SyncState, res: ThreadSync, held: HeldStamp): SyncPlan {
  if (scopeChanged(state, res)) return restart(res.scope);
  const gone = new Set(res.gone);
  const upsert = latestById(res.messages).filter((m) => !gone.has(m.id) && isNewer(m, held(m.id)));
  return {
    reset: false,
    upsert,
    remove: [...gone],
    threads: res.threads,
    state: { cursor: cursorAfter(state, res), more: res.has_more, scope: res.scope },
  };
}

/**
 * A full page continues from its own tail, even behind the mark (a rewound window holding more than
 * one page is read to its end, never cut short); a last page never moves the mark back.
 */
const cursorAfter = (state: SyncState, res: ThreadSync): string | null =>
  res.has_more ? res.cursor : laterCursor(state.cursor, res.cursor);

/** The store was filled under another scope (a chat left the teacher's families, say). */
const scopeChanged = (state: SyncState, res: ThreadSync): boolean =>
  state.scope !== null && state.scope !== res.scope;

/**
 * Wipe and start over: this answer only covers rows after the old cursor, so none of it is kept;
 * `more` makes the engine ask again at once, from the first row.
 */
const restart = (scope: string): SyncPlan => ({
  reset: true,
  upsert: [],
  remove: [],
  threads: [],
  state: { cursor: null, more: true, scope },
});
