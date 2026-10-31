import { lessonStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { useTabOpen } from '@/auth/use-tab-open';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { PendingReportRow, TaskRow, UnpaidRow } from './dashboard-types';
import { pendingSubtitle, taskText, unpaidSubtitle } from './work-text';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { statusWord } from '@/core/ui/feedback/lesson-status';

// Taps go into the Students tab: a role without it gets plain rows (a hidden tab goes nowhere).
const openStudent = (id: string, open: boolean) => (open ? () => router.push(`/students/${id}`) : undefined);

/** A started lesson with no sent report: opens that student's report history. */
export function PendingRow({ row }: { row: PendingReportRow }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const toStudents = useTabOpen('students');
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={pendingSubtitle(row, cycle, tz)}
      trailing={
        <StatusChip
          {...lessonStatusStyle[row.status]}
          label={statusWord(row.status)}
          size="sm"
        />
      }
      onPress={toStudents ? () => router.push(`/students/reports/${row.student.id}`) : undefined}
    />
  );
}

/** A package that owes money or is used up: opens the student. */
export function UnpaidListRow({ row }: { row: UnpaidRow }) {
  const toStudents = useTabOpen('students');
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={unpaidSubtitle(row)}
      onPress={openStudent(row.student.id, toStudents)}
    />
  );
}

/** An open admin task; it opens its student when it has one, else it is a plain line. */
export function TaskListRow({ row }: { row: TaskRow }) {
  const toStudents = useTabOpen('students');
  const { student } = row;
  return (
    <ListRow
      title={taskText(row)}
      subtitle={row.title ?? undefined}
      onPress={student ? openStudent(student.id, toStudents) : undefined}
    />
  );
}
