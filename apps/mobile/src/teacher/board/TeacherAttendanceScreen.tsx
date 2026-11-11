import type { AttendanceTableRow, StudentAttendanceTable } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { backWithin } from '@/core/nav/back-within';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { LazyList } from '@/core/ui/lists/LazyList';
import { BackButton } from '@/core/ui/navigation';
import { AttendanceLogHead, AttendanceLogRow, monthOf } from '@/sales/sales';
import { reportFormHref } from '@/core/ui/lists/ReportRows';
import { useTeacherAttendance } from './teacher-board-api';

const keyOf = (row: AttendanceTableRow) => row.lesson_id;
const title = t.teacherBoard.attendanceLog;

/** A row with a sent report opens my lesson's report (every row is my own lesson, docs/46 D4). */
const openRow = (row: AttendanceTableRow) => router.push(reportFormHref(row.lesson_id));

/** The month's rows: striped, a row with a report opens it. */
function Rows({ data }: { data: StudentAttendanceTable }) {
  const cycle = useClockCycle();
  return (
    <LazyList
      accessibilityLabel={title}
      data={data.items}
      keyExtractor={keyOf}
      tabBar={false}
      extraData={cycle}
      renderItem={({ item, index }) => (
        <AttendanceLogRow
          row={item}
          striped={index % 2 === 1}
          cycle={cycle}
          onOpen={item.report_id ? openRow : undefined}
        />
      )}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 16 }}>
          <EmptyState title={t.sales.student.log.empty} />
        </View>
      }
    />
  );
}

/** Before the first month arrives: loading, or a retry when it failed. */
function Waiting({ failed, retry }: { failed: boolean; retry: () => void }) {
  return failed ? <ErrorState onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

/**
 * «سجل الحضور» of one of my students (docs/46 C5, C7): only my own lessons with them, all time, a
 * month at a time (her zone): the month pills, the month's totals and the striped table of the
 * sales log (AttendanceLogHead, AttendanceLogRow) from GET /teachers/me/students/:id/attendance.
 */
export function TeacherAttendanceScreen() {
  const id = useLocalSearchParams<{ id?: string }>().id ?? '';
  const [month, setMonth] = useState<string | null>(null);
  const log = useTeacherAttendance(id, month);
  const data = log.data;
  const back = () => backWithin(`/teacher/reports/student/${id}`);
  const header = (subtitle?: string) => (
    <ScreenHeader
      title={title}
      size="h2"
      subtitle={subtitle}
      leading={<BackButton onPress={back} />}
    />
  );
  if (!data) {
    return (
      <Screen>
        {header()}
        <Waiting failed={log.isError} retry={() => void log.refetch()} />
      </Screen>
    );
  }
  return (
    <Screen>
      {header(monthOf(data.month))}
      <AttendanceLogHead data={data} month={month ?? data.month} onMonth={setMonth} />
      <Rows data={data} />
    </Screen>
  );
}
