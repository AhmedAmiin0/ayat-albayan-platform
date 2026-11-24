import { parseSeen, SEEN_REPORTS_KEY, withSeen } from '../report-seen.js';

// A failed read or write keeps this run's marks only.

export interface SeenStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface SeenStore {
  subscribe: (listener: () => void) => () => void;
  /** The opened ids now (empty until the saved ones are read). */
  current: () => readonly string[];
  mark: (id: string) => void;
}

const quietly = (work: Promise<unknown>): void => void work.catch(() => undefined);

export function seenStore(storage: SeenStorage): SeenStore {
  let seen: readonly string[] = [];
  let loading: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const tell = (): void => listeners.forEach((listener) => listener());
  const merge = (raw: string | null): void => {
    // A mark made while the read was out stays (the saved ids first, then this run's).
    const saved = parseSeen(raw);
    seen = [...saved, ...seen.filter((id) => !saved.includes(id))];
    tell();
  };
  /** The saved ids, read once (a failed read counts as none saved). */
  const ready = (): Promise<void> => {
    loading ??= storage.getItem(SEEN_REPORTS_KEY).then(merge, () => undefined);
    return loading;
  };
  return {
    subscribe: (listener) => {
      quietly(ready());
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    current: () => seen,
    mark: (id) => {
      seen = withSeen(seen, id);
      tell();
      // Saved after the read, so an early mark never wipes the saved ids.
      quietly(ready().then(() => storage.setItem(SEEN_REPORTS_KEY, JSON.stringify(seen))));
    },
  };
}
