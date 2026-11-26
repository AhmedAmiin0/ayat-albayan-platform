import type { UserRole } from '@ab/catalog';
import type { ReactNode } from 'react';
import { Cartouche, PageHead, t } from '@ab/web-kit';
import { StudentReportsBody } from '@/features/reporting/reports/history/StudentReportsBody';

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
