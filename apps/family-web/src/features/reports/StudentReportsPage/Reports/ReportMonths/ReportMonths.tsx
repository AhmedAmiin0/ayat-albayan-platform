import { reportMonths } from '@ab/client-core';
import { EmptyState, t } from '@ab/web-kit';
import { ReportRow } from '@/features/reports/ReportRow';
import { monthTitle } from './report-months.helpers';
import type { ReportMonthsProps } from './ReportMonths.types';

export function ReportMonths({ reports, student }: ReportMonthsProps) {
  const months = reportMonths(reports, student.tz);
  if (months.length === 0) return <EmptyState title={t.portal.app.reports.empty} />;
  return (
    <>
      {months.map(({ month, rows }) => (
        <section key={month} aria-label={monthTitle(month)} className="grid gap-2">
          <h2 className="text-sm font-semibold text-ink-2">{monthTitle(month)}</h2>
          <ul className="grid gap-2">
            {rows.map((report) => (
              <ReportRow key={report.id} report={report} student={student} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
