import type { UserRole } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { studentReportsQuery } from './api';
import { GradeChart } from './GradeChart';
import { ReportHistoryList } from './ReportHistoryList';
import { TableBox } from '@/components/TableBox';
import { cn } from '@/lib/utils';

export interface StudentReportsPageProps {
  studentId: string;
  /** The student's name for the heading, when the route knows it. */
  name?: string | undefined;
  role: UserRole;
  /** The viewer's zone (the teacher's own; Riyadh for the admin). */
  tz: string;
}

/** «سجل التقارير» of one student (R-REP-05, issue D2): the grade chart, then every report. */
export function StudentReportsPage({ studentId, name, role, tz }: StudentReportsPageProps) {
  const [page, setPage] = useState(1);
  const reports = useQuery({ ...studentReportsQuery(studentId, page), placeholderData: keepPreviousData });
  const head = (
    <PageHead>
      <Cartouche>{t.reports.history}</Cartouche>
      {name && <span className="font-display text-h3 font-bold">{name}</span>}
    </PageHead>
  );
  if (reports.isError) {
    const forbidden = reports.error instanceof ApiError && reports.error.status === 403;
    return <>{head}<FormAlert>{forbidden ? t.common.forbidden : t.common.error}</FormAlert></>;
  }
  if (!reports.data) return <>{head}<ListSkeleton /></>;
  const data = reports.data;
  if (data.total === 0) return <>{head}<EmptyState title={t.reports.noReports} /></>;

  return (
    <>
      {head}
      <section aria-label={t.reports.progress} className="mb-8 grid gap-3">
        <h2 className="font-display text-h3 font-bold">{t.reports.progress}</h2>
        <GradeChart series={data.series} tz={tz} />
      </section>
      <section aria-label={t.reports.title} className={cn('flex flex-auto flex-col gap-2', reports.isPlaceholderData && 'opacity-60')}>
        <h2 className="font-display text-h3 font-bold">{t.reports.title}</h2>
        <TableBox className="px-3">
          <ReportHistoryList items={data.items} role={role} tz={tz} />
        </TableBox>
        <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
      </section>
    </>
  );
}
