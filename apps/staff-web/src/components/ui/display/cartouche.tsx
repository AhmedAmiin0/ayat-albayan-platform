import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// The screen title (docs/07 §5): exactly ONE per screen, holding the screen title (or the entity
// name on a profile). Renders the screen's heading, h1 by default. Owner, 2026-10-05 («simplify»):
// a plain bold heading in the UI face, no surah-header caps, gold frame or wash.
export interface CartoucheProps {
  children: ReactNode;
  /** Heading level; the screen title is the h1. */
  as?: 'h1' | 'h2';
  className?: string;
}

export function Cartouche({ children, as: Heading = 'h1', className }: CartoucheProps) {
  return (
    <Heading
      className={cn(
        'min-w-0 max-w-full shrink-0 font-display text-[22px] leading-[1.4] font-bold text-ink sm:text-[26px]',
        className,
      )}
    >
      {children}
    </Heading>
  );
}
