/** Listeners for useSyncExternalStore: subscribe, and tell them all. */
export function createListeners() {
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    tell: (): void => listeners.forEach((l) => l()),
  };
}

/** Counted watchers per key; `dropped` runs when a key's last watcher leaves. */
export function createWatches(dropped: (key: string) => void) {
  const counts = new Map<string, number>();
  return {
    has: (key: string): boolean => counts.has(key),
    keys: (): string[] => [...counts.keys()],
    add(key: string): () => void {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const left = (counts.get(key) ?? 1) - 1;
        counts.set(key, left);
        if (left > 0) return;
        counts.delete(key);
        dropped(key);
      };
    },
  };
}
