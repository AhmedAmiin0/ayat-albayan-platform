import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Logo, RunningHead, meQuery, t, cn } from '@ab/web-kit';
import { NotificationBell } from '@/features/messaging/notifications/NotificationBell';
import { Crumbs } from '@/components/shell/nav/Crumbs';
import { INBOX_PAGE, isInboxPath } from './inbox-route';
import { MenuBar } from '@/components/shell/header/MenuBar';
import { PageFrame } from './PageFrame';
import { SideFoot } from '@/components/shell/account/SideFoot';

export interface AdminLayoutProps {
  nav: ReactNode;
  /** The current page's title for the compact bar (< 900px). */
  title: string;
  children: ReactNode;
}

/** Sidebar from 900px, a menu sheet below it (docs/07 §7); only the page content scrolls. */
export function AdminLayout({ nav, title, children }: AdminLayoutProps) {
  const { data: me } = useQuery(meQuery);
  const aside = useRef<HTMLElement>(null);
  // resolvedLocation: the Link is only aria-current once the (code-split) child route resolved.
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname });
  useEffect(() => {
    // Sidebar (≥900px): keep the current section in view; scroll-padding keeps it clear of the foot.
    aside.current?.querySelector('nav [aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname, nav]); // nav changes when its counts arrive (they shift the items)
  const inbox = isInboxPath(pathname);
  return (
    <div className="flex h-dvh flex-col overflow-hidden shell:grid shell:grid-cols-[236px_minmax(0,1fr)]">
      <MenuBar home="/admin" title={title} nav={nav} email={me?.email} className="shell:hidden sm:mx-2" />
      {/* scroll-pb-64 exceeds the sticky foot's height so a focused link scrolls clear of it. */}
      <aside
        ref={aside}
        className={cn(
          'relative hidden shrink-0 px-3',
          'shell:flex shell:h-dvh shell:flex-col shell:gap-y-6 shell:scroll-pb-64 shell:overflow-y-auto shell:overflow-x-hidden shell:border-e shell:border-rule shell:bg-cover shell:pt-6 shell:pb-0',
        )}
      >
        <Link to="/admin" activeOptions={{ exact: true }} aria-label={t.app.name} className="shrink-0 rounded-md px-1.5 no-underline shell:px-3">
          <Logo />
        </Link>
        {nav}
        <SideFoot email={me?.email} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)] sm:px-2 sm:pb-[max(0.625rem,env(safe-area-inset-bottom))] shell:h-dvh shell:px-4 shell:pb-5">
        <div className="shrink-0 max-sm:hidden">
          {/* The bell from 900px only: below it the compact bar carries it (640–900px show both). */}
          <RunningHead
            crumbs={<Crumbs />}
            end={
              <div className="hidden shell:block">
                <NotificationBell />
              </div>
            }
          />
        </div>
        <PageFrame pageClassName={inbox ? INBOX_PAGE : undefined}>{children}</PageFrame>
      </div>
    </div>
  );
}
