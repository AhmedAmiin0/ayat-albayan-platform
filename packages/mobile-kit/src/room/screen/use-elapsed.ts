import { useEffect, useState } from 'react';

/** «04:12» / «1:04:12»: whole seconds as the room's timer shows them. Pure. */
export function elapsedText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n: number) => String(n).padStart(2, '0');
  const hours = Math.floor(s / 3600);
  const mm = `${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
  return hours > 0 ? `${hours}:${mm}` : mm;
}

/** The time since `since` (epoch ms), ticking each second; null while there is none. */
export function useElapsed(since: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  return since === null ? null : elapsedText((now - since) / 1000);
}
