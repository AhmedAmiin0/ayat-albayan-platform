import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { RunningHead, meQuery, cn } from '@ab/web-kit';
import { INBOX_PAGE_TOPBAR, isInboxPath, WIDE_PAGE_TOPBAR } from './inbox-route';
import { MenuBar } from '@/components/shell/header/MenuBar';
import { PageFrame } from './PageFrame';
import { WideHeader, type BarProps } from './TopBarLayout';

export interface FixedTopBarLayoutProps {
  topNav: ReactNode;
  bar: BarProps;
  /** Every page gets the inbox's full width and frame (the assistant's shell). */
  wide?: boolean;
  children: ReactNode;
}

/** Only the page content scrolls; from 1340px the inbox's clocks sit in the header row. */
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
      <WideHeader clocks={full ? <RunningHead layout="inline" /> : undefined} />
      <div className="hidden shrink-0 px-1.5 pt-3 shell:block">{topNav}</div>
      {/* The full-width row only below 1340px, where the wide header does not hold its clocks. */}
      <div className={cn('shrink-0', full && 'min-[1340px]:hidden')}>
        <RunningHead />
      </div>
      <PageFrame pageClassName={inbox ? INBOX_PAGE_TOPBAR : wide ? WIDE_PAGE_TOPBAR : undefined}>
        {children}
      </PageFrame>
    </div>
  );
}
