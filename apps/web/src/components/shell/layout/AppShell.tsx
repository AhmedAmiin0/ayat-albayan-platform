import { Outlet, useChildMatches, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { usePresenceSelf } from '@/features/platform/presence';
import { RouteFade } from './RouteFade';
import { AdminLayout } from './AdminLayout';
import { FixedTopBarLayout } from './FixedTopBarLayout';
import { titleFor, type NavTitleItem } from '@/components/shell/nav/nav-title';
import { TopBarLayout, type SectionHome } from './TopBarLayout';

export interface AppShellProps {
  /** Cartouche title of the section home (/admin, /teacher, /portal). */
  title: string;
  /** Where the logo mark of the compact bar links. */
  home: SectionHome;
  /** The fihris; when given, the admin sidebar layout, otherwise the teacher/guardian top bar. */
  nav?: ReactNode;
  /** Links under the top bar (the teacher's own pages); top-bar layout only. */
  topNav?: ReactNode;
  /** The section's pages (nav items and a few deeper pages): the compact bar's page title. */
  titles?: readonly NavTitleItem[];
  /** Top-bar layout only: every page gets the chat's full width and frame (the assistant's shell). */
  wide?: boolean;
  /** What the section home shows instead of the title cartouche (the family portal's one page). */
  homePage?: ReactNode;
}

/**
 * Signed-in layout (docs/07 §7): margin + running head + ONE work page. Child routes render
 * inside the page and own its title; the section home shows `title`. Below 900px every area gets
 * the same compact bar with «القائمة» (MenuBar). Admin and teacher layouts are viewport-high
 * frames: only the page content scrolls, never the browser page. Every signed-in user is tracked
 * «متصل الآن» here while the tab is visible (docs/33).
 */
export function AppShell({ title, home, nav, topNav, titles = [], wide, homePage }: AppShellProps) {
  usePresenceSelf();
  const isHome = useChildMatches().length === 0;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bar = { home, title: isHome ? title : titleFor(pathname, titles, title) };
  const content = <RouteFade>{isHome ? (homePage ?? <Cartouche>{title}</Cartouche>) : <Outlet />}</RouteFade>;
  if (nav) return <AdminLayout nav={nav} title={bar.title}>{content}</AdminLayout>;
  if (topNav) return <FixedTopBarLayout topNav={topNav} bar={bar} wide={wide}>{content}</FixedTopBarLayout>;
  return <TopBarLayout bar={bar}>{content}</TopBarLayout>;
}
