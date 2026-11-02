import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { RunningHead } from '@/components/ui/layout/running-head';
import { meQuery } from '@/features/people/auth/me';
import { cn } from '@/lib/utils';
import { INBOX_PAGE_TOPBAR, isInboxPath, WIDE_PAGE_TOPBAR } from './inbox-route';
import { MenuBar } from '@/components/shell/header/MenuBar';
import { PageFrame } from './PageFrame';
import { WideHeader, type BarProps } from './TopBarLayout';

export interface FixedTopBarLayoutProps {
  topNav: ReactNode;
  bar: BarProps;
  /** Every page gets the inbox's full width and frame (the assistant's shell, owner 2026-10-20). */
  wide?: boolean;
  children: ReactNode;
}

/**
 * The teacher's (and the salesperson's) layout: a fixed viewport-high frame. From 900px the
 * header, the row of links and the running head stay put; below it ONE compact bar whose
 * «القائمة» opens the same links in a sheet. The page fills the rest and ONLY its content scrolls.
 * The inbox (every page when `wide`) takes the full width, and from 1340px its clocks sit inside the
 * header row (no running-head row).
 */
export function FixedTopBarLayout({ topNav, bar, wide = false, children }: FixedTopBarLayoutProps) {
  const { data: me } = useQuery(meQuery);
  const inbox = isInboxPath(useRouterState({ select: (s) => s.resolvedLocation?.pathname }));
  const full = wide || inbox;
  return (
    <div
      className={cn(
        'mx-auto flex h-dvh flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] sm:px-2 sm:pb-3 shell:px-6',
        full ? 'max-w-none' : 'max-w-[1180px]',
      )}
    >
      <MenuBar {...bar} nav={topNav} email={me?.email} className="shell:hidden" />
      <WideHeader clocks={full ? <RunningHead className="min-h-0 flex-nowrap whitespace-nowrap" /> : undefined} />
      <div className="hidden shrink-0 px-1.5 pt-3 shell:block">{topNav}</div>
      {/* The full-width row only below 1340px, where the wide header does not hold its clocks. */}
      <div className={cn('shrink-0', full && 'min-[1340px]:hidden')}>
        <RunningHead />
      </div>
      <PageFrame pageClassName={inbox ? INBOX_PAGE_TOPBAR : wide ? WIDE_PAGE_TOPBAR : undefined}>{children}</PageFrame>
    </div>
  );
}
