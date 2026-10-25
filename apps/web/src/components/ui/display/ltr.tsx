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

/**
 * Rich-text slot for i18n strings with country codes (docs/07 §6, §14.4): every «+966» / «+20»
 * becomes its own LTR island, so the RTL paragraph can't print «966+».
 */
export function isolateLtr(text: string): ReactNode[] {
  return text.split(/(\+[0-9]+)/).map((part, i) => (i % 2 === 1 ? <Ltr key={i}>{part}</Ltr> : part));
}
