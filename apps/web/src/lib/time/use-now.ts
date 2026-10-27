import { useEffect, useState } from 'react';

/**
 * The current time, re-read every `intervalMs` (a minute) so «ادخل الحلقة» opens by itself, and at
 * once when the tab is shown again (a background tab's timers are throttled, so a page left open
 * overnight would still show yesterday). The timer and the listener are removed on unmount.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
