import { clockOfHhmm } from '@ab/time';
import { useClock } from './clock';

/** Values stay the stored 24 h "HH:MM"; pair with `dir={clockDir(useClock())}` on the select. */
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
