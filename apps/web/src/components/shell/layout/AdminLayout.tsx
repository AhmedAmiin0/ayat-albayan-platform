import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Logo } from '@/components/ui/display/mark';
import { RunningHead } from '@/components/ui/layout/running-head';
import { meQuery } from '@/features/people/auth/me';
import { NotificationBell } from '@/features/messaging/notifications/NotificationBell';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { Crumbs } from '../nav/Crumbs';
import { INBOX_PAGE, isInboxPath } from './inbox-route';
import { MenuBar } from '../header/MenuBar';
import { PageFrame } from './PageFrame';
import { SideFoot } from '../account/SideFoot';

export interface AdminLayoutProps {
  nav: ReactNode;
  /** The current page's title for the compact bar (< 900px). */
  title: string;
  children: ReactNode;
}

/**
 * Admin layout (docs/07 §7): the mint fihris sidebar from 900px; below it ONE compact bar whose
 * «القائمة» opens the same nav in a sheet (phones and portrait tablets, owner 2026-10-05). Both are
 * viewport-high columns: running head (breadcrumbs + clocks, from 640px), then the work page whose
 * content scrolls by itself.
 */
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
      {/* `relative`: absolutely positioned sr-only text in a long sidebar stays inside its scroll clip.
          From 900px the rhythm is a 4px grid: 24 on top, 24 logo → fihris, 16 between groups; the sticky
          foot owns the 24 at the bottom, so it stays on screen on short viewports. scroll-pb-64 (256px)
          is the foot's height (~230px with the clock format and the «حسابي» chip) and more: a focused or current link
          scrolls clear of the sticky foot. It scrolls down only, never sideways (owner 2026-10-18). */}
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
