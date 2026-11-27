import { clockOfHhmm } from '@ab/time';
import { useClock } from '@ab/web-kit/lib/clock';
import type { ClockOptionsProps } from './ClockOptions.types';

export function useClockOptions({ times }: ClockOptionsProps) {
  const clock = useClock();
  const options = times.map((value) => ({
    value,
    label: clockOfHhmm(value, clock.cycle, clock.locale),
  }));
  return { options };
}
