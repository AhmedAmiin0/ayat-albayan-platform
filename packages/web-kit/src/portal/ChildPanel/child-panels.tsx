import type { ChildTab } from '@ab/client-core';
import type { ReactNode } from 'react';
import { ChannelThread } from '@ab/web-kit/components/channel/ChannelThread';
import { HistoryPanel } from '@ab/web-kit/portal/history/HistoryPanel';
import { LessonsPanel } from '@ab/web-kit/portal/lessons/LessonsPanel';
import { PackagePanel } from '@ab/web-kit/portal/package/PackagePanel';
import { RecordingsPanel } from '@ab/web-kit/portal/recordings/RecordingsPanel';
import type { PanelProps } from './ChildPanel.types';

/** Only the shown panel mounts; chat answers 403 family_chat_off while disabled. */
export const PANELS: Record<ChildTab, (props: PanelProps) => ReactNode> = {
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
