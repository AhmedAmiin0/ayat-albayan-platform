import type { ChildTab } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { ChannelThread } from '@/features/teaching/student-channel';
import { HistoryPanel } from '@ab/web-kit/portal/history/HistoryPanel';
import { LessonsPanel } from '@ab/web-kit/portal/lessons/LessonsPanel';
import { PackagePanel } from '@ab/web-kit/portal/package/PackagePanel';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

interface PanelProps {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
}

/** Each tab's panel; only the shown one mounts, so the package is never asked for a child. */
const PANELS: Record<ChildTab, (props: PanelProps) => ReactNode> = {
  upcoming: ({ student }) => <LessonsPanel student={student} />,
  attended: (props) => <HistoryPanel {...props} status="attended" />,
  absent: (props) => <HistoryPanel {...props} status="absent" />,
  package: ({ student }) => <PackagePanel student={student} />,
  chat: ({ student }) => (
    <ChannelThread refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />
  ),
};

export function ChildPanel({ tab, ...props }: PanelProps & { tab: ChildTab }) {
  return <>{PANELS[tab](props)}</>;
}
