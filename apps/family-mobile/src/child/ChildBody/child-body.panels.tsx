import type { ChildTab } from '@ab/client-core';
import type { ReactNode } from 'react';
import { PackageBody } from '@/package';
import { HistoryPanel } from '@/child/HistoryPanel';
import { UpcomingPanel } from '@/child/UpcomingPanel';
import type { ChildPanelProps } from './ChildBody.types';

/** Recordings and chat have no panel: each opens its own screen. */
export const PANEL: Record<ChildTab, (p: ChildPanelProps) => ReactNode> = {
  upcoming: (p) => <UpcomingPanel student={p.student} own={p.own} />,
  attended: (p) => <HistoryPanel student={p.student} status="attended" />,
  absent: (p) => <HistoryPanel student={p.student} status="absent" />,
  package: (p) => <PackageBody student={p.student} />,
  recordings: () => null,
  chat: () => null,
};
