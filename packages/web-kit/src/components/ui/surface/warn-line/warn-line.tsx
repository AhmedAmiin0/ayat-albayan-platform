import type { WarnLineProps } from './warn-line.types';

/** A caution under a choice (a hamish line: gold-soft rule, act ink): not an error. */
export function WarnLine({ message }: WarnLineProps) {
  return (
    <p
      role="status"
      className="border-s-[3px] border-gold-soft ps-2.5 text-xs font-semibold text-act"
    >
      {message}
    </p>
  );
}
