import { useRouter } from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';
import { isPlainClick } from '@/features/reports/history/ReportLink';

export interface HubLinkProps {
  /** A path with its query (`/admin/settings/values?group=academy&q=…`). */
  href: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * A real <a href> that navigates in-app on a plain click (ctrl / cmd / middle click keep the
 * browser's), so a link can carry any query string without a typed route search.
 */
export function HubLink({ href, children, className, id }: HubLinkProps) {
  const router = useRouter({ warn: false });
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!router || !isPlainClick(e)) return;
    e.preventDefault();
    void router.navigate({ href });
  };
  return (
    <a id={id} href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
