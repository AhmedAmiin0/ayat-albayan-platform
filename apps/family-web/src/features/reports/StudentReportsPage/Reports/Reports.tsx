import { QueryState } from '@ab/web-kit';
import { ReportMonths } from './ReportMonths';
import type { ReportsProps } from './Reports.types';
import { useReports } from './use-reports';

export function Reports({ student }: ReportsProps) {
  const { query } = useReports({ student });
  return (
    <QueryState query={query}>
      {(data) => <ReportMonths reports={data.reports} student={student} />}
    </QueryState>
  );
}
