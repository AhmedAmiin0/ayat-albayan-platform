import { useRouter } from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { cn } from '@ab/web-kit/lib/utils';

export interface ReportLinkProps {
  href: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** The lead of a teacher's lesson is filled (docs/48); a peer stays secondary. */
  variant?: 'primary' | 'secondary';
  className?: string;
}

/** Plain left click → client-side navigation; ctrl / cmd / middle click keep the browser's. */
export function isPlainClick(e: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** A real anchor so lesson cards also render without a router in their unit tests. */
export function ReportLink(props: ReportLinkProps) {
  const { href, children, size = 'sm', variant = 'secondary', className } = props;
  const router = useRouter({ warn: false });
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!router || !isPlainClick(e)) return;
    e.preventDefault();
    void router.navigate({ href });
  };
  return (
    <a href={href} onClick={onClick} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </a>
  );
}
