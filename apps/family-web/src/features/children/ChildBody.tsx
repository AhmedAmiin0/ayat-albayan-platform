import type { ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Tabs, tabIds } from '@ab/web-kit/components/ui/layout/tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { HistoryPanel } from '@ab/web-kit/portal/history/HistoryPanel';
import { LessonsPanel } from '@ab/web-kit/portal/lessons/LessonsPanel';
import { PackagePanel } from '@ab/web-kit/portal/package/PackagePanel';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { shownTab, tabOptions } from './child-tabs';

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for; the page's own state otherwise. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}

type Panel = (student: PortalStudent, open: (report: OpenReport) => void) => ReactNode;

/** Only the shown panel mounts: a child's login never asks for the package. No chat yet. */
const PANEL: Readonly<Record<ChildTab, Panel>> = {
  upcoming: (student) => <LessonsPanel student={student} />,
  attended: (student, open) => (
    <HistoryPanel student={student} status="attended" onOpenReport={open} />
  ),
  absent: (student, open) => <HistoryPanel student={student} status="absent" onOpenReport={open} />,
  package: (student) => <PackagePanel student={student} />,
  chat: () => null,
};

const PREFIX = 'child';

/**
 * One child's page body (docs/50 §6, canvas Child): القادمة · حضرها · غاب عنها · الباقة (the
 * last only for a viewer who sees money). A report opens on its own page (/report/<id>).
 */
export function ChildBody({ student, kind, tab, onTab }: Props) {
  const navigate = useNavigate();
  const tabs = tabOptions(kind, student);
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
