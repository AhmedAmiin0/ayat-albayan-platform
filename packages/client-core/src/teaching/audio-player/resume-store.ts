import { parseResume, RESUME_KEY, withPosition, type ResumeMap } from './resume';

// The saved stops as an external store (useSyncExternalStore) over the device's async storage:
// read once on first use, a save shows at once and is then written. A failed read or write keeps
// this run's stops only; a listener never sees an error.

export interface ResumeStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface ResumeStore {
  subscribe: (listener: () => void) => () => void;
  current: () => ResumeMap;
  save: (input: { id: string; position: number; duration: number }) => void;
}

export function resumeStore(storage: ResumeStorage): ResumeStore {
  let map: ResumeMap = {};
  let read: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };
  const load = (): Promise<void> => {
    read ??= storage.getItem(RESUME_KEY).then(
      (raw) => {
        map = { ...parseResume(raw), ...map };
        notify();
      },
      () => undefined,
    );
    return read;
  };
  return {
    subscribe: (listener) => {
      void load();
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    current: () => map,
    save: (input) => {
      map = withPosition(map, input);
      notify();
      const write = load().then(() => storage.setItem(RESUME_KEY, JSON.stringify(map)));
      void write.catch(() => undefined);
    },
  };
}
