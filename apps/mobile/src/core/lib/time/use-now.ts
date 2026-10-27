import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE = 60_000;

/**
 * `Date.now()` as a Date, refreshed every minute and at once when the app comes back to the
 * foreground (a background timer is paused, so a screen left open overnight would show yesterday
 * until the next tick). The timer and the AppState listener are removed on unmount.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, MINUTE);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}
