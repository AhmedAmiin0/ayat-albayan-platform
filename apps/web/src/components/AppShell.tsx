import { Outlet, useChildMatches } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { Logo } from '@/components/ui/mark';
import { Page } from '@/components/ui/page';
import { RunningHead } from '@/components/ui/running-head';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { RouteFade } from './RouteFade';
import { AdminLayout } from './shell/AdminLayout';
import { FixedTopBarLayout } from './shell/FixedTopBarLayout';
import { LanguageSwitch } from './shell/LanguageSwitch';
import { LogoutButton } from './shell/LogoutButton';
import { PhoneTheme } from './shell/PageFrame';

export interface AppShellProps {
  /** Cartouche title of the section home (/admin, /teacher, /portal). */
  title: string;
  /** The fihris; when given, the admin sidebar layout, otherwise the teacher/guardian top bar. */
  nav?: ReactNode;
  /** Links under the top bar (the teacher's own pages); top-bar layout only. */
  topNav?: ReactNode;
}

/**
 * Signed-in layout (docs/07 §7): margin + running head + ONE work page. Child routes render
 * inside the page and own its title; the section home shows `title`. Admin and teacher layouts are
 * viewport-high frames: only the page content scrolls, never the browser page.
 */
export function AppShell({ title, nav, topNav }: AppShellProps) {
  const isHome = useChildMatches().length === 0;
  const content = <RouteFade>{isHome ? <Cartouche>{title}</Cartouche> : <Outlet />}</RouteFade>;
  if (nav) return <AdminLayout nav={nav}>{content}</AdminLayout>;
  if (topNav) return <FixedTopBarLayout topNav={topNav}>{content}</FixedTopBarLayout>;
  return <TopBarLayout>{content}</TopBarLayout>;
}

/** Guardian: same margin, page and title, no fihris; 48px controls; the browser page scrolls. */
function TopBarLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[1180px] px-2 pb-5 shell:px-6">
      <header className="flex items-center gap-3 px-1.5 pt-4">
        <Logo />
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle className="hidden sm:inline-flex" />
          <LogoutButton className="size-12 sm:size-12" />
        </div>
      </header>
      <RunningHead />
      <main className="min-w-0">
        <Page>{children}</Page>
      </main>
      <PhoneTheme className="sm:hidden" />
    </div>
  );
}
