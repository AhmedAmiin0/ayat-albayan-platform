import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/mark';
import { RunningHead } from '@/components/ui/running-head';
import { meQuery } from '@/features/auth/me';
import { t } from '@/lib/i18n';
import { Crumbs } from './Crumbs';
import { INBOX_PAGE, isInboxPath } from './inbox-route';
import { MenuBar } from './MenuBar';
import { PageFrame } from './PageFrame';
import { SideFoot } from './SideFoot';

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
  // resolvedLocation: the Link is only aria-current once the (code-split) child route resolved.
  const inbox = isInboxPath(useRouterState({ select: (s) => s.resolvedLocation?.pathname }));
  return (
    <div className="flex h-dvh flex-col overflow-hidden shell:grid shell:grid-cols-[236px_minmax(0,1fr)]">
      <MenuBar home="/admin" title={title} nav={nav} email={me?.email} className="shell:hidden sm:mx-2" />
      {/* `relative`: absolutely positioned sr-only text in a long sidebar stays inside its scroll clip. */}
      <aside className="relative hidden h-dvh flex-col gap-[26px] overflow-y-auto border-e border-rule bg-cover px-3 pt-[22px] pb-4 shell:flex">
        <Link to="/admin" activeOptions={{ exact: true }} aria-label={t.app.name} className="shrink-0 rounded-md px-1.5 no-underline">
          <Logo />
        </Link>
        {nav}
        <SideFoot email={me?.email} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)] sm:px-2 sm:pb-[max(0.625rem,env(safe-area-inset-bottom))] shell:h-dvh shell:px-4 shell:pb-5">
        <div className="shrink-0 max-sm:hidden">
          <RunningHead crumbs={<Crumbs />} />
        </div>
        <PageFrame pageClassName={inbox ? INBOX_PAGE : undefined}>{children}</PageFrame>
      </div>
    </div>
  );
}
