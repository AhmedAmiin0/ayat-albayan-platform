import { useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/mark';
import { RunningHead } from '@/components/ui/running-head';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';
import { INBOX_PAGE, isInboxPath } from './inbox-route';
import { PageFrame, PhoneTheme } from './PageFrame';

/**
 * The teacher's layout: a fixed viewport-high frame. The header, the nav and the running head stay
 * put, the jadwal page fills the rest and ONLY its content scrolls (tables and lists), never the
 * browser page. On phones the bottom nav keeps its own room.
 */
export function FixedTopBarLayout({ topNav, children }: { topNav: ReactNode; children: ReactNode }) {
  const inbox = isInboxPath(useRouterState({ select: (s) => s.resolvedLocation?.pathname }));
  return (
    <div className="mx-auto flex h-dvh max-w-[1180px] flex-col overflow-hidden px-2 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-3 shell:px-6">
      <header className="flex shrink-0 items-center gap-3 px-1.5 pt-4">
        <Logo />
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle className="hidden sm:inline-flex" />
          <LogoutButton className="size-12 sm:size-12" />
        </div>
      </header>
      <div className="shrink-0 sm:px-1.5 sm:pt-3">{topNav}</div>
      <div className="shrink-0">
        <RunningHead />
      </div>
      {/* The inbox (a chat on phones) leaves the theme switch to the other pages. */}
      <PageFrame pageClassName={inbox ? INBOX_PAGE : undefined} footer={!inbox && <PhoneTheme className="sm:hidden" />}>
        {children}
      </PageFrame>
    </div>
  );
}
