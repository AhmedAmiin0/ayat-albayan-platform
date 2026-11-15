import { reportMonths } from '@ab/client-core';
import { localDateIn, type PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import {
  AppText,
  EmptyState,
  ErrorState,
  SkeletonCard,
  t,
  type,
  useNow,
  useTheme,
} from '@ab/mobile-kit';
import { Figure, monthTitle } from '@/lessons';
import { useChildReports } from '@/portal';
import { ReportRow } from './ReportRow';

/** The student's reports under their month, with this month's count on top. */
export function OwnReports({ student }: { student: PortalStudent }) {
  const { color } = useTheme();
  const reports = useChildReports(student.id);
  const thisMonth = localDateIn(useNow(), student.tz).slice(0, 7);
  const R = t.portal.app.reports;
  if (!reports.data) {
    return reports.isError ? (
      <ErrorState onRetry={() => void reports.refetch()} />
    ) : (
      <SkeletonCard />
    );
  }
  const months = reportMonths(reports.data.reports, student.tz);
  if (months.length === 0) return <EmptyState title={R.empty} />;
  const count = months.find((m) => m.month === thisMonth)?.rows.length ?? 0;
  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        <Figure tone="ok" value={String(count)} label={R.thisMonth} />
      </View>
      {months.map(({ month, rows }) => (
        <View key={month} style={{ gap: 8 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}>
            {monthTitle(month)}
          </AppText>
          {rows.map((report) => (
            <ReportRow key={report.id} report={report} student={student} />
          ))}
        </View>
      ))}
    </>
  );
}
