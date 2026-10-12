import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/mark';
import { Page } from '@/components/ui/page';
import { RunningHead } from '@/components/ui/running-head';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { meQuery } from '@/features/auth/me';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { AccountChip } from './AccountChip';
import { LanguageSwitch } from './LanguageSwitch';
import { LogoutButton } from './LogoutButton';
import { MenuBar } from './MenuBar';

export type SectionHome = '/admin' | '/teacher' | '/sales' | '/assistant' | '/portal';

/** The compact bar's link target and title (AppShell works out the title from the path). */
export interface BarProps {
  home: SectionHome;
  title: string;
}

/** The wide header (≥ 900px) of the top-bar layouts: logo, bell (staff), language, theme, «حسابي», logout. */
export function WideHeader() {
  return (
    <header className="hidden shrink-0 items-center gap-3 px-1.5 pt-4 shell:flex">
      <Logo />
      <div className="ms-auto flex items-center gap-2">
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
