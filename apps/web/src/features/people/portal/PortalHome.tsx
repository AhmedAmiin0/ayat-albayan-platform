import { familyChats, type PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Tabs, tabIds } from '@/components/ui/layout/tabs';
import { t } from '@/lib/i18n/i18n';
import { ChannelThread, portalUnreadQuery } from '@/features/teaching/student-channel';
import { portalHomeQuery } from './api';
import { LessonsPanel } from './lessons/LessonsPanel';
import { LoadState } from './LoadState';
import { PackagePanel } from './PackagePanel';
import { ReportsPanel } from './ReportsPanel';
import { StudentSwitcher } from './StudentSwitcher';

type Section = 'lessons' | 'reports' | 'package' | 'chat';
const BASE_SECTIONS: { value: Section; label: string }[] = [
  { value: 'lessons', label: t.portal.lessonsTab },
  { value: 'reports', label: t.portal.reportsTab },
  { value: 'package', label: t.portal.packageTab },
];
/** «المحادثة مع المعلم/ة» carries the family's unread count. */
const chatTab = (unread: number): { value: Section; label: string } => ({
  value: 'chat',
  label: unread > 0 ? `${t.studentChannel.portalTab} (${unread})` : t.studentChannel.portalTab,
});
const PREFIX = 'portal';

/**
 * /portal (docs/31), phone first: the student switcher, then «الحلقات القادمة» / «تقارير الحلقات» /
 * «الباقة» / «المحادثة مع المعلم/ة» (docs/31 §2) as tabs. Every read is the API's whitelist for the login's own students.
 * The chat is the guardian's, or the student's own when they are their own contact (familyChats, owner
 * 2026-10-29): a child's own login has no chat tab.
 */
export function PortalHome() {
  const query = useQuery(portalHomeQuery);
  const [picked, setPicked] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('lessons');
  return (
    <div className="mx-auto grid w-full max-w-[640px] gap-5">
      <LoadState query={query}>
        {(home) => {
          const student: PortalStudent | undefined = home.students.find((s) => s.id === picked) ?? home.students[0];
          if (!student) return <EmptyState title={t.portal.noStudents}>{t.portal.noStudentsHint}</EmptyState>;
          const chats = familyChats({ kind: home.kind, contactIsSelf: student.contact_is_self });
          const shown = section === 'chat' && !chats ? 'lessons' : section;
          const ids = tabIds(PREFIX, shown);
          return (
            <>
              <StudentSwitcher home={home} value={student.id} onChange={setPicked} />
              {chats ? (
                <ChatTabs studentId={student.id} value={shown} onChange={setSection} />
              ) : (
                <Tabs label={t.portal.sections} tabs={BASE_SECTIONS} value={shown} onChange={setSection} idPrefix={PREFIX} />
              )}
              <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
                {shown === 'lessons' && <LessonsPanel key={student.id} student={student} />}
                {shown === 'reports' && <ReportsPanel key={student.id} student={student} />}
                {shown === 'package' && <PackagePanel key={student.id} student={student} renewUrl={home.renew_url} />}
                {shown === 'chat' && <ChannelThread key={student.id} refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />}
              </div>
            </>
          );
        }}
      </LoadState>
    </div>
  );
}

function ChatTabs({ studentId, value, onChange }: { studentId: string; value: Section; onChange: (s: Section) => void }) {
  const unread = useQuery(portalUnreadQuery(studentId)).data?.unread ?? 0;
  return <Tabs label={t.portal.sections} tabs={[...BASE_SECTIONS, chatTab(unread)]} value={value} onChange={onChange} idPrefix={PREFIX} />;
}
