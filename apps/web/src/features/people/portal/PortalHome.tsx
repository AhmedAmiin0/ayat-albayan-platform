import type { PortalStudent } from '@ab/shared';
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
/** «المحادثة مع المعلم/ة» carries the family's unread count. */
const SECTIONS = (unread: number): { value: Section; label: string }[] => [
  { value: 'lessons', label: t.portal.lessonsTab },
  { value: 'reports', label: t.portal.reportsTab },
  { value: 'package', label: t.portal.packageTab },
  { value: 'chat', label: unread > 0 ? `${t.studentChannel.portalTab} (${unread})` : t.studentChannel.portalTab },
];
const PREFIX = 'portal';

/**
 * /portal (docs/31), phone first: the student switcher, then «الحلقات القادمة» / «تقارير الحلقات» /
 * «الباقة» / «المحادثة مع المعلم/ة» (docs/31 §2) as tabs. Every read is the API's whitelist for the login's own students.
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
          const ids = tabIds(PREFIX, section);
          return (
            <>
              <StudentSwitcher home={home} value={student.id} onChange={setPicked} />
              <PortalTabs studentId={student.id} value={section} onChange={setSection} />
              <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
                {section === 'lessons' && <LessonsPanel key={student.id} student={student} />}
                {section === 'reports' && <ReportsPanel key={student.id} student={student} />}
                {section === 'package' && <PackagePanel key={student.id} student={student} renewUrl={home.renew_url} />}
                {section === 'chat' && <ChannelThread key={student.id} refs={{ audience: 'portal', studentId: student.id }} tz={student.tz} />}
              </div>
            </>
          );
        }}
      </LoadState>
    </div>
  );
}

function PortalTabs({ studentId, value, onChange }: { studentId: string; value: Section; onChange: (s: Section) => void }) {
  const unread = useQuery(portalUnreadQuery(studentId)).data?.unread ?? 0;
  return <Tabs label={t.portal.sections} tabs={SECTIONS(unread)} value={value} onChange={onChange} idPrefix={PREFIX} />;
}
