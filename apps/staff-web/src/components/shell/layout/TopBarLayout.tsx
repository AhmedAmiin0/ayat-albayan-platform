import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Logo, Page, RunningHead, meQuery, cn, LanguageSwitch } from '@ab/web-kit';
import { NotificationBell } from '@/features/messaging/notifications/NotificationBell';
import { AccountChip } from '@/components/shell/account/AccountChip';
import { LogoutButton } from '@/components/shell/account/LogoutButton';
import { HeadPrefs } from '@/components/shell/header/HeadPrefs';
import { MenuBar } from '@/components/shell/header/MenuBar';

export type SectionHome = '/admin' | '/teacher' | '/sales' | '/assistant' | '/portal';

/** The compact bar's link target and title (AppShell works out the title from the path). */
export interface BarProps {
  home: SectionHome;
  title: string;
}

/**
 * With the clocks inline the row needs about 1270px (en, real fonts), so below 1340px they get
 * their own row. The theme and time switches sit right before the bell.
 */
export function WideHeader({ clocks }: { clocks?: ReactNode } = {}) {
  return (
    <header className="hidden shrink-0 items-center gap-2 px-1.5 pt-4 shell:flex">
      <Logo />
      {/* Inline only from 1340px, where they fit on one line; below it the layout keeps their own row. */}
      {clocks && <div className="ms-auto hidden min-w-0 overflow-hidden whitespace-nowrap min-[1340px]:block">{clocks}</div>}
      <div className={cn('ms-auto flex items-center gap-1.5', clocks && 'min-[1340px]:ms-0')}>
        <LanguageSwitch />
        <HeadPrefs />
        <NotificationBell />
        <AccountChip variant="inline" />
        <LogoutButton />
      </div>
    </header>
  );
}

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
