import { useEffect, useState } from 'react';

/** Seconds left before an action comes back (the resend timer); `start(n)` restarts it. */
export function useCountdown(): { left: number; start: (seconds: number) => void } {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return { left, start: setLeft };
}
