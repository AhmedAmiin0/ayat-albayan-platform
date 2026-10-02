import { useRouter } from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ReportLinkProps {
  href: string;
  children: ReactNode;
  size?: 'sm' | 'lg';
  className?: string;
}

/** Plain left click → client-side navigation; ctrl / cmd / middle click keep the browser's. */
export function isPlainClick(e: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * «تقرير الحلقة» from a lesson card or drawer. A real <a href> that navigates in-app when a
 * router is mounted (the lesson cards are also rendered without one, in their unit tests).
 */
export function ReportLink({ href, children, size = 'sm', className }: ReportLinkProps) {
  const router = useRouter({ warn: false });
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!router || !isPlainClick(e)) return;
    e.preventDefault();
    void router.navigate({ href });
  };
  return (
    <a href={href} onClick={onClick} className={cn(buttonVariants({ variant: 'secondary', size }), className)}>
      {children}
    </a>
  );
}
