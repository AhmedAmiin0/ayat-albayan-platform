import { useClock } from '@ab/web-kit/lib/clock';

export function useClockOptions() {
  const clock = useClock();
  return { clock };
}
