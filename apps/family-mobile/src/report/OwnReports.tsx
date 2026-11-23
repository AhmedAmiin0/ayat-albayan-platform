import { reportMonths } from '@ab/client-core';
import { localDateIn, type PortalReport, type PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { EmptyState, t, useNow } from '@ab/mobile-kit';
import { Figure, LoadState, MonthSection } from '#/ui/index.ts';
import { useChildReports } from '#/portal/index.ts';
import { ReportRow } from './ReportRow';

interface ReportMonthsProps {
  reports: readonly PortalReport[];
  student: PortalStudent;
}

/** This month's count on top, then the reports under their month. */
function ReportMonths({ reports, student }: ReportMonthsProps) {
  const thisMonth = localDateIn(useNow(), student.tz).slice(0, 7);
  const R = t.portal.app.reports;
  const months = reportMonths(reports, student.tz);
  if (months.length === 0) return <EmptyState title={R.empty} />;
  const count = months.find((m) => m.month === thisMonth)?.rows.length ?? 0;
  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <Figure tone="ok" value={String(count)} label={R.thisMonth} />
      </View>
      {months.map(({ month, rows }) => (
        <MonthSection key={month} month={month}>
          {rows.map((report) => (
            <ReportRow key={report.id} report={report} student={student} />
          ))}
        </MonthSection>
      ))}
    </>
  );
}

/** The student's own sent reports, newest first. */
export function OwnReports({ student }: { student: PortalStudent }) {
  const reports = useChildReports(student.id);
  return (
    <LoadState query={reports}>
      {(data) => <ReportMonths reports={data.reports} student={student} />}
    </LoadState>
  );
}
