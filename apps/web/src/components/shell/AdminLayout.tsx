import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Logo } from '@/components/ui/mark';
import { RunningHead } from '@/components/ui/running-head';
import { meQuery } from '@/features/auth/me';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Crumbs } from './Crumbs';
import { INBOX_PAGE, isInboxPath } from './inbox-route';
import { PageFrame, PhoneTheme } from './PageFrame';
import { SideFoot } from './SideFoot';

/**
 * Admin layout (docs/07 §7): the mint fihris sidebar from 900px (a compact top row below it) and
 * a viewport-high column: running head, then the work page whose content scrolls by itself.
 */
export function AdminLayout({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const aside = useRef<HTMLElement>(null);
  // resolvedLocation: the Link is only aria-current once the (code-split) child route resolved.
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname });
  useEffect(() => {
    // Compact top row (<900px): centre the current section in the strip, clear of both fades.
    aside.current?.querySelector('nav [aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [pathname, nav]); // nav changes when its counts arrive (they shift the items)
  const inbox = isInboxPath(pathname);
  return (
    <div className="flex h-dvh flex-col overflow-hidden shell:grid shell:grid-cols-[236px_minmax(0,1fr)]">
      {/* `relative`: absolutely positioned sr-only text in a long sidebar stays inside its scroll clip.
          From 900px the rhythm is a 4px grid: 24 on top, 24 logo → fihris, 16 between groups; the sticky
          foot owns the 24 at the bottom, so it stays on screen on short viewports. scroll-pb-44 (176px)
          is the foot's height and more: a focused or current link scrolls clear of the sticky foot. */}
      <aside
        ref={aside}
        className={cn(
          'relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-3',
          'shell:h-dvh shell:flex-col shell:flex-nowrap shell:items-stretch shell:gap-y-6 shell:scroll-pb-44 shell:overflow-y-auto shell:border-e shell:border-rule shell:bg-cover shell:pt-6 shell:pb-0',
        )}
      >
        <Link to="/admin" activeOptions={{ exact: true }} aria-label={t.app.name} className="flex min-h-11 shrink-0 items-center rounded-md px-1.5 no-underline shell:min-h-0 shell:px-3">
          <Logo collapse />
        </Link>
        {nav}
        <SideFoot email={me?.email} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] shell:h-dvh shell:px-4 shell:pb-5">
        <div className="shrink-0">
          <RunningHead crumbs={<Crumbs />} />
        </div>
        <PageFrame pageClassName={inbox ? INBOX_PAGE : undefined} footer={<PhoneTheme className={cn('shell:hidden', inbox && 'max-sm:hidden')} />}>
          {children}
        </PageFrame>
      </div>
    </div>
  );
}
