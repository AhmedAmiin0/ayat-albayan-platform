import { portalViewer, readsOwn, type ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Tabs, tabIds } from '@ab/web-kit/components/ui/layout/tabs';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildPanel } from '@ab/web-kit/portal/ChildPanel';
import { UpcomingLookContext } from '@ab/web-kit/portal/lessons/family/upcoming-look';
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

const PREFIX = 'child';
/**
 * Where the chat's newest message stops when it scrolls in (the kit thread's --chat-end-gap): above
 * its composer and, on a phone, the bottom bar with the safe area, so the reply box stays in view.
 */
const END_GAP =
  '[--chat-end-gap:calc(9.5rem+env(safe-area-inset-bottom))] shell:[--chat-end-gap:6rem]';

/**
 * One child's page body (docs/50 §6, canvas Child): القادمة · حضرها · غاب عنها · التسجيلات ·
 * الباقة (the last only for a viewer who sees money) · المحادثة (while family_chat_enabled is on,
 * its unread count on the tab). A report opens on its own page. Only the shown panel mounts
 * (the kit's ChildPanel, shared with the staff pages), «القادمة» in the family look (boards
 * PortalWebHome: the white pill tabs, the emerald next lesson beside the list).
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
  const look = {
    own: readsOwn(portalViewer(kind, student)),
    openReport: (reportId: string) => open({ reportId, recordingId: null }),
  };
  return (
    <div className="grid gap-7">
      <Tabs
        label={t.portal.childTabs}
        tabs={tabs}
        value={shown}
        onChange={onTab}
        idPrefix={PREFIX}
        followSelected
        className="justify-self-start"
      />
      <div key={shown} role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}
        className={`animate-fade-up ${END_GAP}`}>
        <UpcomingLookContext value={look}>
          <ChildPanel tab={shown} student={student} onOpenReport={open} />
        </UpcomingLookContext>
      </div>
    </div>
  );
}
