import { logReportAction, type LogReportAction } from '@ab/client-core';
import type { AttendanceTableRow, ClockCycle, StudentAttendanceTable } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { LazyList } from '@/core/ui/lists/LazyList';
import { reportFormHref } from '@/core/ui/lists/ReportRows';
import { AttendanceLogHead, AttendanceLogRow } from '@/sales/sales';
import { useTeacherAttendance } from '@/teacher/board/teacher-board-api';
import { UpcomingLessons } from './UpcomingLessons';

const keyOf = (row: AttendanceTableRow) => row.lesson_id;
const openRow = (row: AttendanceTableRow) => router.push(reportFormHref(row.lesson_id));

/** The report cell's word for her action on a row (docs/47). */
const LABEL: Record<LogReportAction, () => string> = {
  edit: () => t.reports.edit,
  view: () => t.reports.view,
  write: () => t.teacherBoard.writeReport,
};

interface LogRowProps {
  row: AttendanceTableRow;
  index: number;
  at: { now: Date; tz: string; cycle: ClockCycle };
}

/** A past lesson: a row she can write, edit or view a report of opens its form; others do not. */
function LogRow({ row, index, at }: LogRowProps) {
  const action = logReportAction(row, at.now);
  return (
    <AttendanceLogRow
      row={row}
      striped={index % 2 === 1}
      cycle={at.cycle}
      tz={at.tz}
      onOpen={action ? openRow : undefined}
      reportLabel={action ? LABEL[action]() : null}
    />
  );
}

interface MonthHeadProps {
  data: StudentAttendanceTable | undefined;
  month: string | null;
  onMonth: (month: string) => void;
  tz: string;
  failed: boolean;
  retry: () => void;
}

/** The month pills and totals once the month arrives; loading, or a retry when it failed. */
function MonthHead({ data, month, onMonth, tz, failed, retry }: MonthHeadProps) {
  if (data) {
    const chosen = month ?? data.month;
    return <AttendanceLogHead data={data} month={chosen} onMonth={onMonth} tz={tz} wideReport />;
  }
  return failed ? <ErrorState onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

interface LogPaneProps {
  id: string;
  /** The head's next 14 days. */
  upcoming: AttendanceTableRow[];
  /** Her zone (teachers.tz): the API buckets the months in it. */
  tz: string;
}

/**
 * «الحلقات» of the teacher's student file (docs/47): her next 14 days with the student (cancelled
 * and moved ones with their reasons), then «سجل الحضور» a month at a time (docs/46 C5), each row
 * with its outcome, the cancel or move reason and the report action. Dates in her zone.
 */
export function LogPane({ id, upcoming, tz }: LogPaneProps) {
  const cycle = useClockCycle();
  const now = useNow();
  const [month, setMonth] = useState<string | null>(null);
  const log = useTeacherAttendance(id, month);
  const retry = () => void log.refetch();
  const at = { now, tz, cycle };
  return (
    <LazyList
      accessibilityLabel={t.teacherBoard.attendanceLog}
      data={log.data?.items ?? []}
      keyExtractor={keyOf}
      tabBar={false}
      extraData={`${cycle}:${tz}:${now.getTime()}`}
      ListHeaderComponent={
        <View style={{ gap: 16 }}>
          <UpcomingLessons rows={upcoming} tz={tz} cycle={cycle} />
          <MonthHead
            data={log.data}
            month={month}
            onMonth={setMonth}
            tz={tz}
            failed={log.isError}
            retry={retry}
          />
        </View>
      }
      renderItem={({ item, index }) => <LogRow row={item} index={index} at={at} />}
      refreshing={log.isRefetching}
      onRefresh={retry}
      ListEmptyComponent={log.data ? <EmptyState title={t.sales.student.log.empty} /> : null}
    />
  );
}
