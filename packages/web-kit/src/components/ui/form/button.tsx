import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@ab/web-kit/lib/utils';

// docs/07 §6: green is the only action colour, one filled primary per section; edges per variant.

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold leading-tight no-underline transition-[color,background-color,border-color,transform] duration-(--duration-press) ease-ink motion-safe:active:not-disabled:scale-98 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4.25 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** One per view. */
        primary: 'border-transparent bg-primary text-primary-foreground hover:not-disabled:bg-primary-hover',
        /** Peers; the border is its only edge (3:1 rule-input). */
        secondary: 'bg-secondary text-secondary-foreground border-input hover:not-disabled:bg-sunk',
        /** Tertiary header actions only, and inline add actions. */
        ghost: 'border-transparent bg-transparent text-lapis hover:not-disabled:bg-accent',
        /** Inside a confirm dialog only. */
        danger: 'border-transparent bg-destructive-solid text-destructive-foreground',
        /** The outlined danger of a sheet or row; label and edge in the bad tone. */
        'danger-quiet': 'bg-transparent text-destructive border-destructive hover:not-disabled:bg-danger-soft',
      },
      // Phones: 48px like the app (docs/07), sm keeps the 44px floor; 32/40 from 640px.
      size: {
        sm: 'min-h-11 px-3 text-xs sm:min-h-8',
        md: 'min-h-12 px-4 text-sm sm:min-h-10',
        lg: 'min-h-12 px-5 text-body',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
