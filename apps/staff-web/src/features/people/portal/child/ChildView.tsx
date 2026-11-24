import { childTabs, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { tabIds } from '@ab/web-kit/components/ui/layout/tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReportView, type OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { useFamilyChatOn } from '@ab/web-kit/portal/use-family-chat';
import { ChildPanel } from '@ab/web-kit/portal/ChildPanel';
import { CHILD_TABS_PREFIX, ChildTabs } from './ChildTabs';

interface Props {
  kind: PortalKind;
  student: PortalStudent;
  /** A guardian's way back to every child; a student's own login has no list. */
  onBack?: () => void;
}

/** The package tab is for guardian and adult logins; chat needs family_chat_enabled (docs/50). */
export function ChildView({ kind, student, onBack }: Props) {
  const tabs = childTabs({ kind, student, chatOn: useFamilyChatOn() });
  const [picked, setPicked] = useState<ChildTab>('upcoming');
  const [report, setReport] = useState<OpenReport | null>(null);
  const shown = tabs.includes(picked) ? picked : 'upcoming';
  if (report) {
    return <ReportView studentId={student.id} report={report} onBack={() => setReport(null)} />;
  }
  const ids = tabIds(CHILD_TABS_PREFIX, shown);
  return (
    <div className="grid gap-4">
      {onBack && (
        <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={onBack}>
          {t.portal.allChildren}
        </Button>
      )}
      <header className="grid gap-0.5">
        <h1 className="font-display text-h2 font-bold">{student.name}</h1>
        <p className="text-xs text-ink-3 tabular-nums">{t.portal.code.replace('{code}', student.code)}</p>
      </header>
      <ChildTabs tabs={tabs} studentId={student.id} value={shown} onChange={setPicked} />
      <div key={shown} role="tabpanel" id={ids.panel} aria-labelledby={ids.tab} className="animate-fade-up">
        <ChildPanel tab={shown} student={student} onOpenReport={setReport} />
      </div>
    </div>
  );
}
