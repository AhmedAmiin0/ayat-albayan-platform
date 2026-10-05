import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { Input } from './input';

/**
 * The search box every list shares: a magnifier at the inline-start (right in RTL) inside an Input
 * with the stock control height (44px on phones, 40px from 640px), the same as the Button beside it
 * in a toolbar, so the row lines up. `className` goes on the input.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <span className="relative block">
      <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <Input ref={ref} type="search" className={cn('ps-10', className)} {...props} />
    </span>
  ),
);
SearchInput.displayName = 'SearchInput';
