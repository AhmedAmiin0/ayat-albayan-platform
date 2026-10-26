import { useEffect, useState } from 'react';

/** Date.now(), re-read every second while `running` (the call timer). */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [running]);
  return now;
}
