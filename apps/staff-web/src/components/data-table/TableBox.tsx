import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit';

/**
 * The box a list screen's table lives in. On a tall window (`tall:`, 40rem wide and high) it takes
 * the rest of the page frame (`h-0 flex-auto`: the rows never size it, the pager stays under it),
 * rows scroll inside it and the header row stays pinned (PageFrame's `thead th` sticky rule).
 * Below that (phones, short laptop windows) it flows with the page, so the frame is the only
 * scroller and no box sits inside a scrolling page (docs/66 §1).
 */
export const tableBoxClass = cn(
  'relative flex flex-col rounded-md border border-rule',
  'tall:h-0 tall:min-h-60 tall:flex-auto tall:overflow-auto tall:overscroll-contain',
);

export function TableBox({
  children,
  center,
  className,
}: {
  children: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      data-table-box
      className={cn(tableBoxClass, center && 'items-center justify-center p-4 tall:overflow-visible', className)}
    >
      {children}
    </div>
  );
}
