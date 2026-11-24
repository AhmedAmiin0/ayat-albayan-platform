import { countdownTick, RESEND_SECONDS } from '@ab/client-core';
import { useEffect, useState } from 'react';

/** Seconds left before resend comes back; `restart` after each sent code. */
export function useCountdown(seconds: number = RESEND_SECONDS) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft(countdownTick), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return { left, restart: () => setLeft(seconds) };
}
