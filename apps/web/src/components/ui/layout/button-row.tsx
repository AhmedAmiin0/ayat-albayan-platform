import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonRowProps {
  /** 2–3 peer Buttons (or button-styled links), in reading order. */
  children: ReactNode;
  /** Names the group when it needs one («تسجيل الحضور»). */
  label?: string;
  className?: string;
}

/**
 * docs/07 §6 ButtonRow: peer actions as equal cells filling the row (each grows from a zero basis),
 * in reading order. A cell never shrinks below its one-line label (up to the row's width), so a row
 * that does not fit wraps to full-width lines instead of clipping or scrolling the page sideways. A full-width primary sits alone above it.
 */
export function ButtonRow({ children, label, className }: ButtonRowProps) {
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label}
      className={cn('flex flex-wrap gap-2 *:min-w-[min(100%,max-content)] *:flex-[1_1_0]', className)}
    >
      {children}
    </div>
  );
}
