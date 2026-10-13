import { useRouter } from '@tanstack/react-router';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { isPlainClick } from '@/lib/plain-click';

export interface AppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** An in-app path (/admin/book): navigated client-side, never a document load. */
  href: string;
}

/**
 * A real <a href> to an in-app page that navigates through the router when one is mounted, so a
 * tap never reloads the whole app (owner 2026-10-13). Without a router (unit tests) and on a
 * ctrl / cmd / middle click it stays the browser's link. The caller's onClick runs first.
 */
export function AppLink({ href, onClick, ...rest }: AppLinkProps) {
  const router = useRouter({ warn: false });
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !router || !isPlainClick(e)) return;
    e.preventDefault();
    void router.navigate({ href });
  };
  return <a href={href} {...rest} onClick={go} />;
}
