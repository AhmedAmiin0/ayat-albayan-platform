import type { ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ChannelThread } from '@ab/web-kit/components/channel/ChannelThread';
import { Tabs, tabIds } from '@ab/web-kit/components/ui/layout/tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { HistoryPanel } from '@ab/web-kit/portal/history/HistoryPanel';
import { LessonsPanel } from '@ab/web-kit/portal/lessons/LessonsPanel';
import { PackagePanel } from '@ab/web-kit/portal/package/PackagePanel';
import { RecordingsPanel } from '@ab/web-kit/portal/recordings/RecordingsPanel';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { shownTab, tabOptions } from './child-tabs';
import { useChatTab } from './use-chat-tab';

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for; the page's own state otherwise. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

type Panel = (student: PortalStudent, open: (report: OpenReport) => void) => ReactNode;

/**
 * Only the shown panel mounts: a child's login never asks for the package. «المحادثة» is the
 * student's thread with the teacher (refs portal + the student in view, docs/31 §2); the API
 * refuses it while the switch is off (403 family_chat_off), shown as the thread's load error.
 */
const PANEL: Readonly<Record<ChildTab, Panel>> = {
  upcoming: (student) => <LessonsPanel student={student} />,
  attended: (student, open) => (
    <HistoryPanel student={student} status="attended" onOpenReport={open} />
  ),
  absent: (student, open) => <HistoryPanel student={student} status="absent" onOpenReport={open} />,
  recordings: (student, open) => <RecordingsPanel student={student} onOpenReport={open} />,
  package: (student) => <PackagePanel student={student} />,
  chat: (student) => (
    <ChannelThread refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />
  ),
};

const PREFIX = 'child';

/**
 * One child's page body (docs/50 §6, canvas Child): القادمة · حضرها · غاب عنها · التسجيلات ·
 * الباقة (the last only for a viewer who sees money) · المحادثة (while family_chat_enabled is on,
 * its unread count on the tab). A report opens on its own page.
 */
export function ChildBody({ student, kind, tab, onTab }: Props) {
  const navigate = useNavigate();
  const tabs = tabOptions(kind, student, useChatTab(student.id));
  const shown = shownTab(tabs, tab);
  const ids = tabIds(PREFIX, shown);
  const open = (report: OpenReport) =>
    void navigate({
      to: '/report/$reportId',
      params: { reportId: report.reportId },
      search: { studentId: student.id, recording: report.recordingId ?? undefined },
    });
  return (
    <div className="grid gap-4">
      <Tabs
        label={t.portal.childTabs}
        tabs={tabs}
        value={shown}
        onChange={onTab}
        idPrefix={PREFIX}
      />
      <div key={shown} role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}
        className="animate-fade-up">
        {PANEL[shown](student, open)}
      </div>
    </div>
  );
}
