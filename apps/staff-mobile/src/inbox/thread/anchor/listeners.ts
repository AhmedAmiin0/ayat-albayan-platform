/** A store's change listeners: useSyncExternalStore's subscribe, and a notify for each change. */
export function listenerSet() {
  const listeners = new Set<() => void>();
  return {
    notify: (): void => {
      for (const listener of listeners) listener();
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
