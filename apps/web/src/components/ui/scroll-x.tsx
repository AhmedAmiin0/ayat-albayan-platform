import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A wide table scrolling sideways in its own box (components.css `.ab-scroll-x`). A scrollable box
 * must be reachable by keyboard (WCAG 2.1.1, axe `scrollable-region-focusable`): it is a focusable,
 * named region, so Tab lands on it (the global lapis focus ring) and the arrow keys scroll it.
 * `label` is the table's own name, which names the region too.
 */
export function ScrollX({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="region" tabIndex={0} aria-label={label} className={cn('ab-scroll-x rounded-xs', className)}>
      {children}
    </div>
  );
}
