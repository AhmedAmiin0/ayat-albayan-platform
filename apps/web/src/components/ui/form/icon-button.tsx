import * as React from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; name the row it acts on: «رسالة واتساب لأم إيمان», «إجراءات سهيلة محمد». */
  label: string;
}

/**
 * 44px on phones (docs/07 §4 touch floor), 34px from 640px. Shared with icon *links* (wa.me).
 * Size overrides pass both steps, e.g. `size-11 sm:size-7`.
 */
export const iconButtonClass =
  'grid size-11 shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-[120ms] hover:bg-sunk hover:text-ink sm:size-[34px] pointer-coarse:size-11';

/** Neutral icon button (row actions, dialog close, logout). Always visible, never hover-only. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(iconButtonClass, 'disabled:cursor-not-allowed disabled:opacity-45', className)}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';
