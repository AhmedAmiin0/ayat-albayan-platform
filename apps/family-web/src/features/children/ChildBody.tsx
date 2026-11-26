import type { ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Tabs, tabIds, t } from '@ab/web-kit';
import { ChildPanel } from '@ab/web-kit/room';
import type { OpenReport } from '@ab/web-kit';
import { shownTab, tabOptions } from './child-tabs';
import { useChatTab } from './use-chat-tab';

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for; the page's own state otherwise. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
  /** The home shows the next lesson above the tabs, so the upcoming tab lists the rest. */
  exceptNext?: boolean;
}

const PREFIX = 'child';
/**
 * Where the chat's newest message stops when it scrolls in (the kit thread's --chat-end-gap): above
 * its composer and, on a phone, the bottom bar with the safe area, so the reply box stays in view.
 */
const END_GAP =
  '[--chat-end-gap:calc(9.5rem+env(safe-area-inset-bottom))] shell:[--chat-end-gap:6rem]';

/** docs/50 §6: package tab only for a viewer who sees money; only the shown panel mounts. */
export function ChildBody({ student, kind, tab, onTab, exceptNext }: Props) {
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
  const openLesson = (lessonId: string) =>
    void navigate({ to: '/lesson/$lessonId', params: { lessonId }, search: { studentId: student.id } });
  return (
    <div className="grid gap-4">
      <Tabs
        label={t.portal.childTabs}
        tabs={tabs}
        value={shown}
        onChange={onTab}
        idPrefix={PREFIX}
        followSelected
      />
      <div key={shown} role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}
        className={`animate-fade-up ${END_GAP}`}>
        <ChildPanel tab={shown} student={student} onOpenReport={open} onOpenLesson={openLesson}
          exceptNext={exceptNext} />
      </div>
    </div>
  );
}
