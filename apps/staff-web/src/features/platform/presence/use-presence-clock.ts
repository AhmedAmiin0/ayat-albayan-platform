import { useClock, type Clock } from '@ab/web-kit/lib/clock';
import { useNow } from '@ab/web-kit/lib/time/use-now';

/** Re-reads the time every 30 seconds so relative presence text stays fresh. */
export const PRESENCE_TICK_MS = 30_000;

/** The viewer's clock (12/24 h, language) and the time now, for presenceLine / lastMessageLine. */
export function usePresenceClock(): Clock & { now: Date } {
  const clock = useClock();
  const now = useNow(PRESENCE_TICK_MS);
  return { ...clock, now };
}
