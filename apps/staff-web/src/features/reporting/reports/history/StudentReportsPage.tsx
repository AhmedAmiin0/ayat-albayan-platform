import type { UserRole } from '@ab/shared';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { t } from '@/lib/i18n/i18n';
import { StudentReportsBody } from './StudentReportsBody';

export interface StudentReportsPageProps {
  studentId: string;
  /** The student's name for the heading, when the route knows it. */
  name?: string | undefined;
  role: UserRole;
  /** The viewer's zone (the teacher's own; Riyadh for the admin). */
  tz: string;
  /** A line under the heading (the teacher's «trial family → sales» note). */
  notice?: ReactNode;
}

/** «سجل التقارير» of one student (R-REP-05, issue D2): the grade chart, then every report. */
export function StudentReportsPage({ studentId, name, role, tz, notice }: StudentReportsPageProps) {
  return (
    <>
      <PageHead>
        <Cartouche>{t.reports.history}</Cartouche>
        {name && <span className="font-display text-h3 font-bold">{name}</span>}
      </PageHead>
      {notice}
      <StudentReportsBody studentId={studentId} role={role} tz={tz} />
    </>
  );
}
