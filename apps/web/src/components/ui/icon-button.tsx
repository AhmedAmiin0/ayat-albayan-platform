import * as React from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; name the row it acts on: «رسالة واتساب لأم إيمان», «إجراءات سهيلة محمد». */
  label: string;
}

/** 34px neutral icon button (row actions, dialog close, logout). Always visible, never hover-only. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'grid size-[34px] shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-[120ms] hover:bg-sunk hover:text-ink disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';
