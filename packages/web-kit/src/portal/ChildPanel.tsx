import type { ChildTab } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import { ChannelThread } from '#/components/channel/index.ts';
import { HistoryPanel } from '#/portal/history/HistoryPanel/index.ts';
import { LessonsPanel } from '#/portal/lessons/LessonsPanel.tsx';
import { PackagePanel } from '#/portal/package/PackagePanel.tsx';
import { RecordingsPanel } from '#/portal/recordings/RecordingsPanel/index.ts';
import type { OpenReport } from '#/portal/report/ReportView.tsx';

interface PanelProps {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
  /** The family web's own lesson page (files without a recording); the staff pages pass none. */
  onOpenLesson?: (lessonId: string) => void;
  /** «القادمة» leaves out the next lesson, shown above the tabs (the family home). */
  exceptNext?: boolean;
}

/**
 * Each child tab's panel (docs/50 §6), mounted by the family web app and the staff portal pages:
 * only the shown one mounts, so the package is never asked for a child. «المحادثة» is the
 * student's thread (refs portal + the student in view, docs/31 §2); the API refuses it while
 * family_chat_enabled is off (403 family_chat_off), shown as the thread's load error.
 */
const PANELS: Record<ChildTab, (props: PanelProps) => ReactNode> = {
  upcoming: ({ student, exceptNext }) => <LessonsPanel student={student} exceptNext={exceptNext} />,
  attended: (props) => <HistoryPanel {...props} status="attended" />,
  absent: (props) => <HistoryPanel {...props} status="absent" />,
  recordings: ({ student, onOpenReport }) => (
    <RecordingsPanel student={student} onOpenReport={onOpenReport} />
  ),
  package: ({ student }) => <PackagePanel student={student} />,
  chat: ({ student }) => (
    <ChannelThread refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />
  ),
};

export function ChildPanel({ tab, ...props }: PanelProps & { tab: ChildTab }) {
  return <>{PANELS[tab](props)}</>;
}
