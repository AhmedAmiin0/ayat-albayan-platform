import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit/lib/utils';

/**
 * A family page's content column under its Hero (boards): 1120 px wide on the cream page, a 16 px
 * gutter on phones, room above the phone's bottom bar (the shell pads the bar itself).
 */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-6 sm:gap-7 sm:py-9',
      className)}>
      {children}
    </div>
  );
}
