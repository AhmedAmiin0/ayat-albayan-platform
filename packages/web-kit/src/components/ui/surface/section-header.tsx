import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit/lib/utils';

const HEADING = { 2: 'h2', 3: 'h3' } as const;

export interface SectionHeaderProps {
  title: string;
  /** For `aria-labelledby` on the section it heads. */
  id?: string;
  /** One quiet action at the inline-end. */
  action?: ReactNode;
  /** The outline level; the look stays the same (h2 under a page title, h3 inside a card). */
  level?: keyof typeof HEADING;
  className?: string;
}

/**
 * A section's heading (audit 2026-11-19, extraction 2): one small semibold line in ink-2 with an
 * optional action at the end, so every section of a page reads the same.
 */
export function SectionHeader({ title, id, action, level = 2, className }: SectionHeaderProps) {
  const Heading = HEADING[level];
  return (
    <div className={cn('flex min-h-8 items-center justify-between gap-3', className)}>
      <Heading id={id} className="text-sm font-semibold text-ink-2">
        {title}
      </Heading>
      {action}
    </div>
  );
}
