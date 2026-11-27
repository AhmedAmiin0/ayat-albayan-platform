import type { ClockOptionsProps } from './ClockOptions.types';
import { useClockOptions } from './use-clock-options';

/** Values stay the stored 24 h "HH:MM"; pair with `dir={clockDir(useClock())}` on the select. */
export function ClockOptions(props: ClockOptionsProps) {
  const { options } = useClockOptions(props);
  return (
    <>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </>
  );
}
