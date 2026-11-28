import type { AttendanceTableRow } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import {
  ApiError,
  BackButton,
  EmptyState,
  ErrorLine,
  LazyList,
  Screen,
  ScreenHeader,
  t,
} from '@ab/mobile-kit';
import { useClockCycle } from '@/core/lib/clock';
import { useStudentHref, useTreeBase } from '@/core/nav/tree-base';
import { SalesLoadScreen } from '@/sales/sales/components/SalesLoadScreen';
import { AttendanceLogHead } from '@/sales/sales/attendance/AttendanceLogHead';
import { AttendanceLogRow } from '@/sales/sales/attendance/AttendanceLogRow';
import { openAttendanceReport, useAttendanceLog } from '@/sales/sales/attendance/attendance-log-api';
import { monthOf } from '@/sales/sales/attendance/attendance-log-text';

const keyOf = (row: AttendanceTableRow) => row.lesson_id;

/** 409 pdf_not_ready gets its own message; anything else the general error. */
const pdfError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 ? t.reports.error.pdf_not_ready : t.common.error;

/** A row with a sent report opens it for any student; no money, links or notes. */
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
        leading={<BackButton onPress={() => router.back()} />}
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
