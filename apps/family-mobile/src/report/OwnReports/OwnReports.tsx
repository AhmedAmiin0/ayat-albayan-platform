import { LoadState } from '@/ui';
import type { OwnReportsProps } from './OwnReports.types';
import { ReportMonths } from './ReportMonths';
import { useOwnReports } from './use-own-reports';

/** The student's own sent reports, newest first. */
export function OwnReports({ student }: OwnReportsProps) {
  const { reports } = useOwnReports({ student });
  return (
    <LoadState query={reports}>
      {(data) => <ReportMonths reports={data.reports} student={student} />}
    </LoadState>
  );
}
