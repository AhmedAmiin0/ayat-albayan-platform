import { useEffect, useState, useSyncExternalStore } from 'react';

// The chat's connecting bar (S23, the phone's ConnectingBar on the web): the browser's own
// online / offline events. Loaded messages stay; a send while offline fails with its line.

/** The connecting hint follows after 10 s; back shows briefly once reconnected. */
export type ConnectionPhase = 'hidden' | 'connecting' | 'slow' | 'back';

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

/** The browser says it is online (a server render: yes). */
export const useOnline = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

/** What each timed phase becomes, and when. */
const NEXT: Partial<Record<ConnectionPhase, { to: ConnectionPhase; ms: number }>> = {
  connecting: { to: 'slow', ms: 10_000 },
  back: { to: 'hidden', ms: 2_000 },
};

/** The bar's phase: follows the browser's connection, with the two timed steps above. */
export function useConnectionPhase(): ConnectionPhase {
  const online = useOnline();
  const [seen, setSeen] = useState(online);
  const [phase, setPhase] = useState<ConnectionPhase>(online ? 'hidden' : 'connecting');
  if (seen !== online) {
    setSeen(online);
    setPhase(online ? 'back' : 'connecting');
  }
  useEffect(() => {
    const next = NEXT[phase];
    if (!next) return;
    const id = window.setTimeout(() => setPhase(next.to), next.ms);
    return () => window.clearTimeout(id);
  }, [phase]);
  return phase;
}
