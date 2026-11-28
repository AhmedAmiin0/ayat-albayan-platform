import type { UnreadBadgeProps } from './UnreadBadge.types';

/** Keyed by the count at its call site, so it pops in again on each change. */
export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1.5 -end-1.5 grid min-w-5 animate-pop-in place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-primary-foreground tabular-nums"
    >
      {count}
    </span>
  );
}
