import { useEffect, useState } from 'react';

/** `Date.now()` as a Date, refreshed every minute; the timer is cleared on unmount. */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
