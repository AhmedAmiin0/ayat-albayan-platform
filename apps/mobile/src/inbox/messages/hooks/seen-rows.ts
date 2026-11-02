import { createContext, use, useState, useSyncExternalStore } from 'react';
import type { ViewToken } from 'react-native';

/** The thread rows its list has shown on screen at least once (onViewableItemsChanged). */
interface SeenRows {
  has: (id: string) => boolean;
  subscribe: (listener: () => void) => () => void;
}

interface Viewable<T> {
  viewableItems: ViewToken<T>[];
}

/** No list behind the bubble (a test, another screen): it counts as on screen. */
const ON_SCREEN: SeenRows = { has: () => true, subscribe: () => () => undefined };
export const SeenRowsContext = createContext<SeenRows>(ON_SCREEN);

/**
 * A list's seen rows and the viewability handler that feeds them, then hands the tokens on to
 * `next` (the floating day). A row stays seen when it scrolls away: a bubble asks its file once and
 * a scroll back reads the cache.
 */
export function seenRows<T extends { id: string }>(next: (info: Viewable<T>) => void) {
  const ids = new Set<string>();
  const listeners = new Set<() => void>();
  const rows: SeenRows = {
    has: (id) => ids.has(id),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  const onViewableItemsChanged = (info: Viewable<T>) => {
    const fresh = info.viewableItems.map((v) => v.item.id).filter((id) => !ids.has(id));
    fresh.forEach((id) => ids.add(id));
    if (fresh.length > 0) listeners.forEach((listener) => listener());
    next(info);
  };
  return { rows, onViewableItemsChanged };
}

/** seenRows made once: FlatList keeps its first onViewableItemsChanged. */
export function useSeenRows<T extends { id: string }>(next: (info: Viewable<T>) => void) {
  const [made] = useState(() => seenRows(next));
  return made;
}

/** This row has been on the thread's screen (or there is no list to ask). */
export function useSeen(id: string): boolean {
  const rows = use(SeenRowsContext);
  return useSyncExternalStore(rows.subscribe, () => rows.has(id));
}
