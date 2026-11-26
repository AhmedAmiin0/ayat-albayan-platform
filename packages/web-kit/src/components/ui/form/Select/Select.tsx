import * as React from 'react';
import { cn } from '@ab/web-kit/lib/utils';
import { controlClass } from '@ab/web-kit/components/ui/form/Input';

/** Native <select> styled like Input, chevron at the inline-end. Times are always selects (rule 6). */
export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(controlClass, 'ab-select cursor-pointer pe-8', className)} {...props} />
  ),
);
Select.displayName = 'Select';
