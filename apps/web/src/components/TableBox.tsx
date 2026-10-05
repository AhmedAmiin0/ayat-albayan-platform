import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The fixed-height box a list screen's table lives in (owner, 2026-10-05: "make tables have a
 * static height"): it takes the rest of the page frame (a flex column: toolbar auto, this box
 * `h-0 flex-auto`: basis = the 0 height, so the rows never size it; the pager under it) and never less than 320px; rows scroll inside it on both axes and
 * the header row stays pinned (PageFrame's `thead th` sticky rule). Few rows leave the space empty.
 */
export const tableBoxClass =
  'relative flex h-0 min-h-[320px] flex-auto flex-col overflow-auto overscroll-contain rounded-md border border-rule';

export function TableBox({ children, center, className }: { children: ReactNode; center?: boolean; className?: string }) {
  return (
    <div data-table-box className={cn(tableBoxClass, center && 'items-center justify-center p-4', className)}>
      {children}
    </div>
  );
}
