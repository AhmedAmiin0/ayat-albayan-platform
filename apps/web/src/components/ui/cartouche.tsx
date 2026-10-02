import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Surah-header cartouche (docs/07 §5, motif-cartouche-cap.svg): exactly ONE per screen, holding
// the screen title (or the entity name on a profile). Renders the screen's heading, h1 by default.
// The cap is drawn for the LEFT end, so the one on the right flips: start in RTL, end in LTR.
function Cap({ start }: { start?: boolean }) {
  return (
    <svg
      viewBox="0 0 26 52"
      aria-hidden="true"
      focusable="false"
      className={cn('h-full w-[26px] shrink-0', start ? 'rtl:-scale-x-100' : 'ltr:-scale-x-100')}
    >
      <path className="fill-gold-wash" d="M26 6.5H16C12.5 6.5 11.5 9.5 10 13.5L5.6 26L10 38.5C11.5 42.5 12.5 45.5 16 45.5H26Z" />
      <path fill="none" stroke="currentColor" d="M26 2.5H15C9.5 2.5 8.5 7 6.5 12L1.5 26L6.5 40C8.5 45 9.5 49.5 15 49.5H26" />
      <path fill="none" className="stroke-gold-soft" d="M26 6.5H16C12.5 6.5 11.5 9.5 10 13.5L5.6 26L10 38.5C11.5 42.5 12.5 45.5 16 45.5H26" />
      <path fill="currentColor" d="M13.5 23.6 15.9 26 13.5 28.4 11.1 26Z" />
    </svg>
  );
}

export interface CartoucheProps {
  children: ReactNode;
  /** Heading level; the screen title is the h1. */
  as?: 'h1' | 'h2';
  className?: string;
}

export function Cartouche({ children, as: Heading = 'h1', className }: CartoucheProps) {
  return (
    <Heading className={cn('inline-flex h-[52px] max-w-full shrink-0 items-stretch text-gold', className)}>
      <Cap start />
      <span className="my-[2px] flex min-w-0 border-y border-current">
        <span className="my-[3px] flex min-w-0 items-center whitespace-nowrap border-y border-gold-soft bg-gold-wash px-2.5 pb-[5px] font-display text-[21px] font-bold leading-none text-ink sm:text-[25px]">
          {children}
        </span>
      </span>
      <Cap />
    </Heading>
  );
}
