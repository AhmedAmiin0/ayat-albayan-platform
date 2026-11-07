import { chatLiveKey, phoneOfKey, refreshPlan, throttleMsOf, type LiveKey } from './inbox-live.js';
import { createLiveRegistry } from './live-registry.js';
import { liveEvent, type LiveRow } from './live-rows.js';
import { createThrottle, type Throttle } from './throttle.js';

/** What a refresh does in an app: re-read through the API (the same queries its polls run). */
export interface LiveTargets {
  /** The open chat's newest page. */
  chat(phone: string): void;
  list(): void;
  badge(): void;
  /**
   * An event's rows (docs/44 K1): an instant visual patch of the held copies (ticks). The event
   * re-reads all the same; a failed patch is ignored (the read brings the truth).
   */
  rows?(phone: string, rows: readonly LiveRow[]): void | Promise<unknown>;
}

/** The app's patch, never in the way of the re-read (a throw or a rejection is dropped). */
async function patch(targets: LiveTargets | null, phone: string, rows: readonly LiveRow[]) {
  await targets?.rows?.(phone, rows);
}

/** One per app: whether realtime is up (intervals read it), what is on screen, and the throttled refreshes. */
export interface InboxLive {
  isLive(): boolean;
  setLive(live: boolean): void;
  /** For useSyncExternalStore: called when isLive() changes. */
  subscribe(listener: () => void): () => void;
  /** This key is on screen until the returned release. */
  watch(key: LiveKey): () => void;
  /** Its screen unmounted. */
  forget(key: LiveKey): void;
  /** A thread_changed event's payload. */
  changed(payload: unknown): void;
  /** (Re)connected or back in the foreground: the badge and everything on screen once. */
  resync(): void;
  /** Where refreshes go while connected; the release drops the targets and pending refreshes. */
  bind(targets: LiveTargets): () => void;
}

/** `chatOwnsBadge`: an event for the chat on screen leaves the badge to its re-read (AU6). */
export interface InboxLiveOptions {
  chatOwnsBadge?: boolean;
}

export function createInboxLive({ chatOwnsBadge = false }: InboxLiveOptions = {}): InboxLive {
  let live = false;
  let targets: LiveTargets | null = null;
  const listeners = new Set<() => void>();
  const registry = createLiveRegistry();
  const throttles = new Map<LiveKey, Throttle>();
  const run = (key: LiveKey) => {
    const phone = phoneOfKey(key);
    if (phone !== null) targets?.chat(phone);
    else if (key === 'list') targets?.list();
    else targets?.badge();
  };
  const fire = (key: LiveKey) => {
    if (!targets) return;
    let throttle = throttles.get(key);
    if (!throttle)
      throttles.set(key, (throttle = createThrottle(() => run(key), throttleMsOf(key))));
    throttle.call();
  };
  const store: InboxLive = {
    isLive: () => live,
    setLive(next) {
      if (next === live) return;
      live = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    watch(key) {
      if (registry.watch(key)) fire(key);
      return () => registry.unwatch(key);
    },
    forget(key) {
      registry.forget(key);
      throttles.get(key)?.cancel();
      throttles.delete(key);
    },
    changed(payload) {
      const event = liveEvent(payload);
      if (!event) return;
      const { phone, rows } = event;
      // The patch first (the tick moves at once), then the same throttled re-read as ever.
      if (rows) void patch(targets, phone, rows).catch(() => undefined);
      const owned = chatOwnsBadge && registry.isWatched(chatLiveKey(phone));
      for (const key of refreshPlan(phone, owned)) if (registry.route(key)) fire(key);
    },
    resync() {
      fire('badge');
      registry.watched().forEach(fire);
    },
    bind(next) {
      targets = next;
      return () => {
        if (targets !== next) return;
        targets = null;
        throttles.forEach((t) => t.cancel());
        throttles.clear();
        store.setLive(false);
      };
    },
  };
  return store;
}
