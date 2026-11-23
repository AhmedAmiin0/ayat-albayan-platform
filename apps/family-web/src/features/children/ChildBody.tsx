import type { ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Tabs, tabIds } from '@ab/web-kit/layout';
import { t } from '@ab/web-kit/i18n';
import { ChildPanel } from '@ab/web-kit/portal';
import type { OpenReport } from '@ab/web-kit/portal';
import { shownTab, tabOptions } from './child-tabs';
import { useChatTab } from './use-chat-tab';

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for; the page's own state otherwise. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
  /** The home shows the next lesson above the tabs: «القادمة» lists the rest. */
  exceptNext?: boolean;
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
 * (the kit's ChildPanel, shared with the staff pages).
 */
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
