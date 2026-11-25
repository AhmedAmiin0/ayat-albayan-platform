import type { UserRole } from '@ab/catalog';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TableBox } from '@/components/data-table/TableBox';
import { EmptyState, ListSkeleton, FormAlert, Pager, ApiError, t, cn } from '@ab/web-kit';
import { studentReportsQuery } from '@/features/reporting/reports/api';
import { GradeChart } from '@/features/reporting/reports/chart/GradeChart';
import { ReportHistoryList } from './ReportHistoryList';
import { useRecordedLessons } from './use-recorded-lessons';

export interface StudentReportsBodyProps {
  studentId: string;
  role: UserRole;
  /** The viewer's zone (the teacher's own; Riyadh for the admin). */
  tz: string;
}

const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403;

/** Paged reports (R-REP-05), shared with the teacher board's reports tab (docs/46 C1). */
export function StudentReportsBody({ studentId, role, tz }: StudentReportsBodyProps) {
  const [page, setPage] = useState(1);
  const reports = useQuery({
    ...studentReportsQuery(studentId, page),
    placeholderData: keepPreviousData,
  });
  const recorded = useRecordedLessons(studentId);
  if (reports.isError) {
    const text = isForbidden(reports.error) ? t.common.forbidden : t.common.error;
    return <FormAlert>{text}</FormAlert>;
  }
  if (!reports.data) return <ListSkeleton />;
  const data = reports.data;
  if (data.total === 0) return <EmptyState title={t.reports.noReports} />;
  return (
    <>
      <section aria-label={t.reports.progress} className="mb-8 grid gap-3">
        <h2 className="font-display text-h3 font-bold">{t.reports.progress}</h2>
        <GradeChart series={data.series} tz={tz} />
      </section>
      <section
        aria-label={t.reports.title}
        className={cn('flex flex-auto flex-col gap-2', reports.isPlaceholderData && 'opacity-60')}
      >
        <h2 className="font-display text-h3 font-bold">{t.reports.title}</h2>
        <TableBox className="px-3">
          <ReportHistoryList
            items={data.items}
            role={role}
            tz={tz}
            studentId={studentId}
            recorded={recorded}
          />
        </TableBox>
        <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
      </section>
    </>
  );
}
