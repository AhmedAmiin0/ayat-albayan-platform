import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Logo } from '@/components/ui/mark';
import { RunningHead } from '@/components/ui/running-head';
import { meQuery } from '@/features/auth/me';
import { t } from '@/lib/i18n';
import { Crumbs } from './Crumbs';
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
    // Compact top row (<900px): keep the current section in view, clear of the fade.
    aside.current?.querySelector('nav [aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname, nav]); // nav changes when its counts arrive (they shift the items)
  return (
    <div className="flex h-dvh flex-col overflow-hidden shell:grid shell:grid-cols-[236px_minmax(0,1fr)]">
      {/* `relative`: absolutely positioned sr-only text in a long sidebar stays inside its scroll clip. */}
      <aside
        ref={aside}
        className="relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-3 shell:h-dvh shell:flex-col shell:flex-nowrap shell:items-stretch shell:gap-[26px] shell:gap-y-0 shell:overflow-y-auto shell:border-e shell:border-rule shell:bg-cover shell:pt-[22px] shell:pb-4"
      >
        <Link to="/admin" activeOptions={{ exact: true }} aria-label={t.app.name} className="shrink-0 rounded-md px-1.5 no-underline">
          <Logo collapse />
        </Link>
        {nav}
        <SideFoot email={me?.email} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] shell:h-dvh shell:px-4 shell:pb-5">
        <div className="shrink-0">
          <RunningHead crumbs={<Crumbs />} />
        </div>
        <PageFrame footer={<PhoneTheme className="shell:hidden" />}>{children}</PageFrame>
      </div>
    </div>
  );
}
