import { useClock, type Clock } from '@/lib/clock';
import { useNow } from '@/lib/time/use-now';

/** Relative presence text («منذ 5 دقائق») stays fresh: re-read the time every 30 seconds. */
export const PRESENCE_TICK_MS = 30_000;

/** The viewer's clock (12/24 h, language) and the time now, for presenceLine / lastMessageLine. */
export function usePresenceClock(): Clock & { now: Date } {
  const clock = useClock();
  const now = useNow(PRESENCE_TICK_MS);
  return { ...clock, now };
}
