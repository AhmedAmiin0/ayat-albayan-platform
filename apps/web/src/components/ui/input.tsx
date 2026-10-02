import * as React from 'react';
import { cn } from '@/lib/utils';

// docs/07 §6 Input/Select: 3:1 rule-input border on raised paper, lapis focus, cinnabar when
// aria-invalid. 16px text and 44px tall under 640px (iOS zoom floor). LTR values (email, codes,
// phones): pass dir="ltr"; in an RTL page they align to the inline-end so they line up with
// their labels (docs/07); in the English (LTR) page they keep the natural start alignment.
export const controlClass =
  'w-full min-h-11 rounded-md border border-input bg-popover px-3 text-base text-ink placeholder:text-ink-3 focus:border-ring focus:outline-2 focus:outline-offset-1 focus:outline-ring aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger disabled:cursor-not-allowed disabled:bg-sunk disabled:text-ink-3 sm:min-h-10 sm:text-sm rtl:[&[dir=ltr]]:text-end';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(controlClass, className)} {...props} />,
);
Input.displayName = 'Input';
