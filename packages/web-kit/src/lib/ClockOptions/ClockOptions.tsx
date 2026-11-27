import { clockOfHhmm } from '@ab/time';
import type { ClockOptionsProps } from './ClockOptions.types';
import { useClockOptions } from './use-clock-options';

/** Values stay the stored 24 h "HH:MM"; pair with `dir={clockDir(useClock())}` on the select. */
export function ClockOptions({ times }: ClockOptionsProps) {
  const { clock } = useClockOptions();
  return (
    <>
      {times.map((x) => (
        <option key={x} value={x}>
          {clockOfHhmm(x, clock.cycle, clock.locale)}
        </option>
      ))}
    </>
  );
}
