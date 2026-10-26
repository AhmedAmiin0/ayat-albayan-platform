import { useEffect, useState } from 'react';
import type { ConnState } from '@/core/lib/connectivity/connectivity-machine';
import { BAR_DELAY_MS, CONNECTED_MS, connectingPhase, HINT_AFTER_MS, onlinePhase, type BarPhase } from './bar-phase';

/** The bar's phase for a connection state, moved on by timers (jest's fake timers drive them). */
export function useBarPhase({ status, since }: Pick<ConnState, 'status' | 'since'>): BarPhase {
  // Mounted mid-outage (a screen pushed while connecting): already in its phase, so it does not slide in again.
  const [phase, setPhase] = useState<BarPhase>(() => (status === 'online' ? 'hidden' : connectingPhase(Date.now() - (since ?? Date.now()))));
  const [seen, setSeen] = useState(status);
  // A status change resets the phase in the same render (React's «adjusting state on a prop change»).
  if (seen !== status) {
    setSeen(status);
    setPhase(status === 'online' ? onlinePhase(phase) : 'hidden');
  }
  // Nothing is scheduled while online with no bar (every focused screen header mounts this hook).
  const done = phase === 'connected';
  useEffect(() => {
    if (!done) return undefined;
    const away = setTimeout(() => setPhase('hidden'), CONNECTED_MS);
    return () => clearTimeout(away);
  }, [done]);
  useEffect(() => {
    if (status === 'online') return undefined;
    const start = since ?? Date.now();
    const update = () => setPhase(connectingPhase(Date.now() - start));
    const timers = [0, BAR_DELAY_MS, HINT_AFTER_MS].map((at) => setTimeout(update, Math.max(0, at - (Date.now() - start))));
    return () => timers.forEach(clearTimeout);
  }, [status, since]);
  return phase;
}
