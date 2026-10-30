import type { LiveKey } from './inbox-live.js';

/**
 * Which refresh targets are on screen. A watched key (a focused chats tab, an open focused chat)
 * refreshes on its event. A seen key (mounted, but under another screen or tab) is marked dirty
 * instead and refreshes once when it is watched again. A key never watched, or forgotten on unmount,
 * ignores events: a chat opened later loads fresh by itself.
 */
export function createLiveRegistry() {
  const watched = new Map<LiveKey, number>();
  const seen = new Set<LiveKey>();
  const dirty = new Set<LiveKey>();
  return {
    /** Keys on screen now. */
    watched: () => [...watched.keys()],
    /** On screen again: true when a change came meanwhile (refresh it now). */
    watch(key: LiveKey): boolean {
      watched.set(key, (watched.get(key) ?? 0) + 1);
      seen.add(key);
      return dirty.delete(key);
    },
    unwatch(key: LiveKey): void {
      const left = (watched.get(key) ?? 0) - 1;
      if (left > 0) watched.set(key, left);
      else watched.delete(key);
    },
    forget(key: LiveKey): void {
      if (watched.has(key)) return;
      seen.delete(key);
      dirty.delete(key);
    },
    /** A change for this key: true to refresh now; otherwise it is marked dirty if seen. */
    route(key: LiveKey): boolean {
      if (key === 'badge' || watched.has(key)) return true;
      if (seen.has(key)) dirty.add(key);
      return false;
    },
  };
}
