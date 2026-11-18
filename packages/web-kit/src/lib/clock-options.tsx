import { clockOfHhmm } from '@ab/shared';
import { useClock } from './clock';

/**
 * The options of a time select: each value stays the stored «HH:MM» (24 h), its label reads in the
 * viewer's cycle («17:30» or «5:30 م» / «5:30 PM»). Pair with `dir={clockDir(useClock())}` on the select.
 */
export function ClockOptions({ times }: { times: readonly string[] }) {
  const clock = useClock();
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
