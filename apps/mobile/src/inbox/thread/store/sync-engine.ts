import { createThrottle, nextSince, planSync } from '@ab/client-core';
import type { ThreadSync } from '@ab/shared';
import type { MessageStore } from './message-store';

/** A burst of nudges (realtime, push, resume) becomes one sync now and one at the end. */
export const SYNC_THROTTLE_MS = 1_000;
/** With no nudge at all (a quietly dead socket), a sync this often while started. */
export const SYNC_FALLBACK_MS = 30_000;
/** Pages in one run before it yields (a first sync of a big inbox continues on the next). */
export const SYNC_MAX_PAGES = 50;

/** GET /threads/sync from `since` (sync-fetch.ts; a fake in tests). */
type FetchSyncPage = (since: string | undefined, signal: AbortSignal) => Promise<ThreadSync>;

interface SyncEngineDeps {
  store: MessageStore;
  /** The signed-in user the rows are for: a write for anyone else is dropped by the store. */
  owner: string;
  fetchPage: FetchSyncPage;
}

interface SyncEngine {
  /** Something changed on the server: a sync soon (throttled). */
  nudge(): void;
  /** One run now (joins the run in flight and asks for one more after it). */
  syncNow(): Promise<void>;
  /** Syncs at once and every SYNC_FALLBACK_MS until stop(). */
  start(): void;
  /** For good: the request in flight is aborted, nothing more is written. */
  stop(): void;
}

/**
 * The phone's sync loop (docs/43 §5, 43-6): ask from nextSince(state), plan with planSync (by
 * id and stamp; tombstones; a new scope wipes and starts over), write the plan for this owner,
 * and ask again at once while the page was full. A failed run keeps the mark: the next nudge
 * or the fallback asks again from it (upsert by id, so a repeat is harmless).
 */
export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  const { store, owner, fetchPage } = deps;
  const abort = new AbortController();
  let ready: Promise<void> | null = null;
  let running: Promise<void> | null = null;
  let again = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const live = () => !abort.signal.aborted;
  const page = async (): Promise<boolean> => {
    const state = await store.state();
    const res = await fetchPage(nextSince(state), abort.signal);
    const plan = planSync(state, res, await store.held(res.messages.map((m) => m.id)));
    const kept = live() && (await store.apply(plan, owner));
    return kept && plan.state.more;
  };
  const drain = async () => {
    ready ??= store.open(owner);
    await ready;
    let pages = 0;
    while (live() && pages < SYNC_MAX_PAGES && (await page())) pages += 1;
  };
  const settle = () => {
    running = null;
    const more = again && live();
    again = false;
    if (more) void engine.syncNow();
  };
  const engine: SyncEngine = {
    nudge: () => throttle.call(),
    syncNow() {
      again = running !== null;
      running ??= drain().catch(() => undefined).finally(settle);
      return running;
    },
    start() {
      engine.nudge();
      timer ??= setInterval(() => engine.nudge(), SYNC_FALLBACK_MS);
    },
    stop() {
      abort.abort();
      throttle.cancel();
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
  const throttle = createThrottle(() => void engine.syncNow(), SYNC_THROTTLE_MS);
  return engine;
}
