import { useEffect, useState } from 'react';
import type { ConnState } from '@/core/lib/connectivity/connectivity-machine';
import { BAR_DELAY_MS, CONNECTED_MS, connectingPhase, HINT_AFTER_MS, onlinePhase, type BarPhase } from './bar-phase';

/** The bar's phase for a connection state, moved on by timers (jest's fake timers drive them). */
export function useBarPhase({ status, since }: Pick<ConnState, 'status' | 'since'>): BarPhase {
  const [phase, setPhase] = useState<BarPhase>('hidden');
  const [seen, setSeen] = useState(status);
  // A status change resets the phase in the same render (React's «adjusting state on a prop change»).
  if (seen !== status) {
    setSeen(status);
    setPhase(status === 'online' ? onlinePhase(phase) : 'hidden');
  }
  useEffect(() => {
    if (status === 'online') {
      const away = setTimeout(() => setPhase('hidden'), CONNECTED_MS);
      return () => clearTimeout(away);
    }
    const start = since ?? Date.now();
    const update = () => setPhase(connectingPhase(Date.now() - start));
    const timers = [0, BAR_DELAY_MS, HINT_AFTER_MS].map((at) => setTimeout(update, Math.max(0, at - (Date.now() - start))));
    return () => timers.forEach(clearTimeout);
  }, [status, since]);
  return phase;
}
