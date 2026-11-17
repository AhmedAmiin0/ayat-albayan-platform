import { useEffect, useState } from 'react';

/** How often the recording clock is read. */
const TICK_MS = 250;

/**
 * The recording's clock while `on` (ChatXVoice): read from the app's recorder when it tells
 * (`read`), else counted from the start here; 0 while off.
 */
export function useElapsed(on: boolean, read: (() => number) | undefined): number {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const started = Date.now();
    const tick = () => setMs(read ? read() : Date.now() - started);
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(timer);
      setMs(0);
    };
  }, [on, read]);
  return ms;
}
