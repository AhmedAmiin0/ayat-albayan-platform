import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

// docs/07 §6 Button. Lapis is the only action colour; at most ONE filled primary per screen.
// Focus is the global lapis outline (index.css). Icons are 17px; directional ones mirror in RTL.
// The edge colour lives in each variant (not a base border-transparent), so buttonVariants() on a
// <Link> keeps secondary's 3:1 edge without twMerge.

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold leading-tight no-underline transition-colors duration-[120ms] ease-ink cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[17px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** One per view: إضافة طالب, حفظ المواعيد, دمج, تأكيد, دخول. */
        primary: 'border-transparent bg-primary text-primary-foreground enabled:hover:bg-primary-hover',
        /** Peers: تصدير, تعديل, row next-actions. The border is its only edge (3:1 rule-input). */
        secondary: 'bg-secondary text-secondary-foreground border-input enabled:hover:bg-sunk',
        /** إلغاء, سيبها هنا, inline «إضافة ميعاد». */
        ghost: 'border-transparent bg-transparent text-primary enabled:hover:bg-accent',
        /** حذف, inside a confirm only. */
        danger: 'border-transparent bg-destructive-solid text-destructive-foreground',
        /** إلغاء الحلقة in lists. */
        'danger-quiet': 'bg-transparent text-destructive border-destructive/45',
      },
      // Phones get the 44px touch floor (docs/07 §4); 32/40 from 640px.
      size: {
        sm: 'min-h-11 px-3 text-xs sm:min-h-8',
        md: 'min-h-11 px-4 text-sm sm:min-h-10',
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';
