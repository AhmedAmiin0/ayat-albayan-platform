import type { ChildTab } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { ChannelThread } from '@ab/web-kit/components/channel/ChannelThread';
import { HistoryPanel } from '@ab/web-kit/portal/history/HistoryPanel';
import { LessonsPanel } from '@ab/web-kit/portal/lessons/LessonsPanel';
import { PackagePanel } from '@ab/web-kit/portal/package/PackagePanel';
import { RecordingsPanel } from '@ab/web-kit/portal/recordings/RecordingsPanel';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

interface PanelProps {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
}

/**
 * Each child tab's panel (docs/50 §6), mounted by the family web app and the staff portal pages:
 * only the shown one mounts, so the package is never asked for a child. «المحادثة» is the
 * student's thread (refs portal + the student in view, docs/31 §2); the API refuses it while
 * family_chat_enabled is off (403 family_chat_off), shown as the thread's load error.
 */
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
