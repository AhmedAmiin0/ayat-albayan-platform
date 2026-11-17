import type { ChildTab } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { ChannelThread } from '@/features/teaching/student-channel';
import { HistoryPanel } from '@/features/people/portal/history/HistoryPanel';
import { LessonsPanel } from '@/features/people/portal/lessons/LessonsPanel';
import { PackagePanel } from '@/features/people/portal/package/PackagePanel';
import { RecordingsPanel } from '@/features/people/portal/recordings/RecordingsPanel';
import type { OpenReport } from '@/features/people/portal/report/ReportView';

interface PanelProps {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
}

/** Each tab's panel; only the shown one mounts, so the package is never asked for a child. */
const PANELS: Record<ChildTab, (props: PanelProps) => ReactNode> = {
  upcoming: ({ student }) => <LessonsPanel student={student} />,
  attended: (props) => <HistoryPanel {...props} status="attended" />,
  absent: (props) => <HistoryPanel {...props} status="absent" />,
  recordings: (props) => <RecordingsPanel {...props} />,
  package: ({ student }) => <PackagePanel student={student} />,
  chat: ({ student }) => (
    <ChannelThread refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />
  ),
};

export function ChildPanel({ tab, ...props }: PanelProps & { tab: ChildTab }) {
  return <>{PANELS[tab](props)}</>;
}
