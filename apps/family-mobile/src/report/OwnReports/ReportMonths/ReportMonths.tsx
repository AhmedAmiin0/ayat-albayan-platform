import { View } from 'react-native';
import { EmptyState, t } from '@ab/mobile-kit';
import { Figure, MonthSection } from '@/ui';
import { ReportRow } from '@/report/ReportRow';
import type { ReportMonthsProps } from './ReportMonths.types';
import { useReportMonths } from './use-report-months';

/** This month's count on top, then the reports under their month. */
export function ReportMonths({ reports, student }: ReportMonthsProps) {
  const { months, count, empty } = useReportMonths({ reports, student });
  if (empty) return <EmptyState title={t.portal.app.reports.empty} />;
  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <Figure tone="ok" value={String(count)} label={t.portal.app.reports.thisMonth} />
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
