import type { AttendanceTableRow } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { useStudentHref, useTreeBase } from '@/core/nav/tree-base';
import { ErrorLine } from '@/inbox';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SalesLoadScreen } from '../components/SalesLoadScreen';
import { AttendanceLogHead } from './AttendanceLogHead';
import { AttendanceLogRow } from './AttendanceLogRow';
import { openAttendanceReport, useAttendanceLog } from './attendance-log-api';
import { monthOf } from './attendance-log-text';

const keyOf = (row: AttendanceTableRow) => row.lesson_id;

/** 409 pdf_not_ready says so; anything else (offline, gone) the general error, as «التقارير». */
const pdfError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 ? t.reports.error.pdf_not_ready : t.common.error;

/**
 * «سجل الحضور» of one student (owner 2026-10-28), from «تفاصيل الطالب» or the admin's student
 * file: the month pills (newest first), the month's totals and a compact striped table of every
 * past lesson (Riyadh day and time on the viewer's clock, teacher, status chip, report sent or not;
 * trial / makeup tags and the cancel reason under a row). A row with a sent report opens it, for
 * any student (owner 2026-10-30) as «التقارير» does. No money, link or notes.
 */
export function AttendanceLogScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const base = useTreeBase();
  const to = useStudentHref();
  const cycle = useClockCycle();
  const [month, setMonth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const log = useAttendanceLog(base, id, month);
  const data = log.data;
  const open = useCallback(
    (row: AttendanceTableRow) => {
      if (!row.report_id) return;
      setError(null);
      const report = { studentId: id, reportId: row.report_id };
      void openAttendanceReport(base, report, to).catch((e: unknown) => setError(pdfError(e)));
    },
    [base, id, to],
  );
  const renderItem = useCallback(
    ({ item, index }: { item: AttendanceTableRow; index: number }) => (
      <AttendanceLogRow
        row={item}
        striped={index % 2 === 1}
        cycle={cycle}
        onOpen={item.report_id ? open : undefined}
      />
    ),
    [cycle, open],
  );
  const pick = useCallback((m: string) => {
    setError(null);
    setMonth(m);
  }, []);
  const title = t.sales.student.log.title;
  if (!data) {
    return <SalesLoadScreen title={title} query={log} notFound={t.sales.student.notFound} />;
  }
  return (
    <Screen>
      <ScreenHeader
        title={title}
        subtitle={monthOf(data.month)}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <AttendanceLogHead data={data} month={month ?? data.month} onMonth={pick} />
      {error ? <ErrorLine message={error} /> : null}
      <LazyList
        accessibilityLabel={title}
        data={data.items}
        keyExtractor={keyOf}
        renderItem={renderItem}
        extraData={cycle}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState title={t.sales.student.log.empty} />
          </View>
        }
      />
    </Screen>
  );
}
