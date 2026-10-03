import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useChildMatches, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { Logo } from '@/components/ui/mark';
import { Page } from '@/components/ui/page';
import { RunningHead } from '@/components/ui/running-head';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { meQuery } from '@/features/auth/me';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Crumbs } from './shell/Crumbs';
import { LanguageSwitch } from './shell/LanguageSwitch';
import { LogoutButton } from './shell/LogoutButton';
import { SideFoot } from './shell/SideFoot';

export interface AppShellProps {
  /** Cartouche title of the section home (/admin, /teacher, /portal). */
  title: string;
  /** The fihris; when given, the admin sidebar layout, otherwise the teacher/guardian top bar. */
  nav?: ReactNode;
  /** Links under the top bar (the teacher's own pages); top-bar layout only. */
  topNav?: ReactNode;
}

/**
 * Signed-in layout (docs/07 §7): margin + running head + ONE jadwal work page. Child routes render
 * inside the page and own its cartouche; the section home shows `title` in the cartouche.
 */
export function AppShell({ title, nav, topNav }: AppShellProps) {
  const isHome = useChildMatches().length === 0;
  const page = (
    <main className="min-w-0">
      <Page>{isHome ? <Cartouche>{title}</Cartouche> : <Outlet />}</Page>
    </main>
  );
  return nav ? <AdminLayout nav={nav} page={page} /> : <TopBarLayout page={page} topNav={topNav} />;
}

function AdminLayout({ nav, page }: { nav: ReactNode; page: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const aside = useRef<HTMLElement>(null);
  // resolvedLocation: the Link is only aria-current once the (code-split) child route resolved.
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname });
  useEffect(() => {
    // Compact top row (<900px): keep the current section in view, clear of the fade.
    aside.current?.querySelector('nav [aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pathname, nav]); // nav changes when its counts arrive (they shift the items)
  return (
    <div className="min-h-screen shell:grid shell:grid-cols-[236px_minmax(0,1fr)]">
      <aside ref={aside} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-3 shell:flex-nowrap shell:gap-y-0 shell:sticky shell:top-0 shell:h-screen shell:flex-col shell:items-stretch shell:gap-[26px] shell:overflow-y-auto shell:pt-[22px] shell:pb-4">
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          aria-label={t.app.name}
          className="shrink-0 rounded-md px-1.5 no-underline"
        >
          <Logo collapse />
        </Link>
        {nav}
        <SideFoot email={me?.email} />
      </aside>
      <div className="min-w-0 px-2 pb-2.5 shell:px-4 shell:pb-5">
        <RunningHead crumbs={<Crumbs />} />
        {page}
        <PhoneTheme className="shell:hidden" />
      </div>
    </div>
  );
}

/** Teacher / guardian: same margin, page and cartouche, no fihris; 48px controls. */
function TopBarLayout({ page, topNav }: { page: ReactNode; topNav?: ReactNode }) {
  return (
    <div className={cn('mx-auto min-h-screen max-w-[1180px] px-2 pb-5 shell:px-6', topNav && 'pb-24 sm:pb-5')}>
      <header className="flex items-center gap-3 px-1.5 pt-4">
        <Logo />
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle className="hidden sm:inline-flex" />
          <LogoutButton className="size-12 sm:size-12" />
        </div>
      </header>
      {topNav && <div className="sm:px-1.5 sm:pt-3">{topNav}</div>}
      <RunningHead />
      {page}
      <PhoneTheme className="sm:hidden" />
    </div>
  );
}

/** The theme choice under the page where the bar has no room for it (phones). */
function PhoneTheme({ className }: { className: string }) {
  return (
    <div className={cn('flex justify-center pt-4', className)}>
      <ThemeToggle />
    </div>
  );
}
