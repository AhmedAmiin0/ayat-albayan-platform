import type { PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Tabs, tabIds } from '@/components/ui/layout/tabs';
import { t } from '@/lib/i18n/i18n';
import { portalHomeQuery } from './api';
import { LessonsPanel } from './lessons/LessonsPanel';
import { LoadState } from './LoadState';
import { PackagePanel } from './PackagePanel';
import { ReportsPanel } from './ReportsPanel';
import { StudentSwitcher } from './StudentSwitcher';

type Section = 'lessons' | 'reports' | 'package';
const SECTIONS = (): { value: Section; label: string }[] => [
  { value: 'lessons', label: t.portal.lessonsTab },
  { value: 'reports', label: t.portal.reportsTab },
  { value: 'package', label: t.portal.packageTab },
];
const PREFIX = 'portal';

/**
 * /portal (docs/31), phone first: the student switcher, then «الحلقات القادمة» / «تقارير الحلقات» /
 * «الباقة» as tabs. Every read is the API's whitelist for the login's own students.
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
              <Tabs label={t.portal.sections} tabs={SECTIONS()} value={section} onChange={setSection} idPrefix={PREFIX} />
              <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
                {section === 'lessons' && <LessonsPanel key={student.id} student={student} />}
                {section === 'reports' && <ReportsPanel key={student.id} student={student} />}
                {section === 'package' && <PackagePanel key={student.id} student={student} renewUrl={home.renew_url} />}
              </div>
            </>
          );
        }}
      </LoadState>
    </div>
  );
}
