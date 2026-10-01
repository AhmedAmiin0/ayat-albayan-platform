import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** LTR island inside Arabic text (codes AB-0183, E.164 phones, emails, URLs): isolated, no wrap. */
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={cn('whitespace-nowrap tabular-nums', className)}>
      {children}
    </bdi>
  );
}
