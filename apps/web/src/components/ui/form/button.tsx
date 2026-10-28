import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

// docs/07 §6 «الأزرار». Green is the only action colour: white text on the green fill (lapis-fill), green text (lapis) on ghosts; at most ONE filled primary per sheet or section.
// One line, never clipped: a peer row goes in a ButtonRow (components/ui/layout/button-row.tsx).
// Focus is the global lapis outline (index.css). Icons are 17px; directional ones mirror in RTL.
// The edge colour lives in each variant (not a base border-transparent), so buttonVariants() on a
// <Link> keeps secondary's 3:1 edge without twMerge.

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold leading-tight no-underline transition-[color,background-color,border-color,transform] duration-[120ms] ease-out motion-safe:active:not-disabled:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[17px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** One per view: إضافة طالب, حفظ المواعيد, دمج, تأكيد, دخول. */
        primary: 'border-transparent bg-primary text-primary-foreground hover:not-disabled:bg-primary-hover',
        /** Peers: تصدير, تعديل, row next-actions. The border is its only edge (3:1 rule-input). */
        secondary: 'bg-secondary text-secondary-foreground border-input hover:not-disabled:bg-sunk',
        /** Tertiary header actions only («إغلاق»), and inline «إضافة ميعاد». */
        ghost: 'border-transparent bg-transparent text-lapis hover:not-disabled:bg-accent',
        /** حذف, inside a confirm dialog only. */
        danger: 'border-transparent bg-destructive-solid text-destructive-foreground',
        /** The outlined danger of a sheet or row: «إلغاء الحلقة». Label and edge in the bad tone. */
        'danger-quiet': 'bg-transparent text-destructive border-destructive hover:not-disabled:bg-danger-soft',
      },
      // Phones: 48px like the app (docs/07 «الأزرار»), the dense sm keeps the 44px floor; 32/40 from 640px.
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';
