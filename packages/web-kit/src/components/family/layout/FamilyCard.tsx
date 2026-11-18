import type { ReactNode } from 'react';
import { cn } from '@ab/web-kit/lib/utils';

/** The 4 px top edge's colour (boards: green for people, gold for settings and plans, …). */
export type CardTone = 'green' | 'gold' | 'teal' | 'rose' | 'plain';

const EDGE: Record<CardTone, string> = {
  green: 'border-t-4 border-t-[var(--fam-edge-green)]',
  gold: 'border-t-4 border-t-[var(--fam-edge-gold)]',
  teal: 'border-t-4 border-t-[var(--fam-edge-teal)]',
  rose: 'border-t-4 border-t-[var(--fam-edge-rose)]',
  plain: '',
};

interface Props {
  children: ReactNode;
  tone?: CardTone;
  /** `section` with a label, `article`, `li` or a plain `div` (default). */
  as?: 'div' | 'section' | 'article' | 'li';
  label?: string;
  labelledBy?: string;
  className?: string;
}

/** A white card (boards): 20 px corners, the cream hairline, a soft shadow, a coloured top edge. */
export function FamilyCard({ children, tone = 'plain', as = 'div', ...rest }: Props) {
  const Tag = as;
  return (
    <Tag
      aria-label={rest.label}
      aria-labelledby={rest.labelledBy}
      className={cn('rounded-[20px] border border-rule bg-raised p-4 shadow-fam-card sm:p-6',
        EDGE[tone], rest.className)}
    >
      {children}
    </Tag>
  );
}
