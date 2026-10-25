import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/display/mark';
import { Page } from '@/components/ui/layout/page';
import { RunningHead } from '@/components/ui/layout/running-head';
import { ThemeToggle } from '@/components/ui/layout/theme-toggle';
import { meQuery } from '@/features/auth/me';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { cn } from '@/lib/utils';
import { AccountChip } from '../account/AccountChip';
import { LanguageSwitch } from '../account/LanguageSwitch';
import { LogoutButton } from '../account/LogoutButton';
import { MenuBar } from '../header/MenuBar';

export type SectionHome = '/admin' | '/teacher' | '/sales' | '/assistant' | '/portal';

/** The compact bar's link target and title (AppShell works out the title from the path). */
export interface BarProps {
  home: SectionHome;
  title: string;
}

/**
 * The wide header (≥ 900px) of the top-bar layouts: logo, bell (staff), language, theme, «حسابي», logout.
 * `clocks` (the top-bar inbox): from 1340px the running head's calendars and clocks inline, between
 * the logo and the bell, instead of their own row (docs/07 §7 keeps all four). Measured with the real
 * fonts and the longest dates they need about 1190px (ar) and 1324px (en); narrower, they would wrap
 * or paint under the bell, so the layout shows its own row up to 1340px. overflow-hidden guards the rest.
 */
export function WideHeader({ clocks }: { clocks?: ReactNode } = {}) {
  return (
    <header className="hidden shrink-0 items-center gap-3 px-1.5 pt-4 shell:flex">
      <Logo />
      {/* Inline only from 1340px, where they fit on one line; below it the layout keeps their own row. */}
      {clocks && <div className="ms-auto hidden min-w-0 overflow-hidden whitespace-nowrap min-[1340px]:block">{clocks}</div>}
      <div className={cn('ms-auto flex items-center gap-2', clocks && 'min-[1340px]:ms-0')}>
        <NotificationBell />
        <LanguageSwitch />
        <ThemeToggle />
        <AccountChip variant="inline" />
        <LogoutButton />
      </div>
    </header>
  );
}

/**
 * Guardian / assistant: one page, no nav. Below 900px the compact bar («القائمة» holds theme,
 * language and logout); from 900px the logo header. The browser page scrolls.
 */
export function TopBarLayout({ bar, children }: { bar: BarProps; children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  return (
    <div className="mx-auto min-h-screen max-w-[1180px] pb-5 sm:px-2 shell:px-6">
      <MenuBar {...bar} email={me?.email} className="shell:hidden" />
      <WideHeader />
      <RunningHead />
      <main className="min-w-0">
        <Page>{children}</Page>
      </main>
    </div>
  );
}
