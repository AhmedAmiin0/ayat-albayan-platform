import { lessonStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import type { PendingReportRow, TaskRow, UnpaidRow } from './dashboard-types';
import { pendingSubtitle, taskText, unpaidSubtitle } from './work-text';

const openStudent = (id: string) => () => router.push(`/students/${id}`);

/** A started lesson with no sent report: opens that student's report history. */
export function PendingRow({ row }: { row: PendingReportRow }) {
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={pendingSubtitle(row)}
      trailing={
        <StatusChip
          {...lessonStatusStyle[row.status]}
          label={t.enums.lessonStatus[row.status]}
          size="sm"
        />
      }
      onPress={() => router.push(`/students/reports/${row.student.id}`)}
    />
  );
}

/** A package that owes money or is used up: opens the student. */
export function UnpaidListRow({ row }: { row: UnpaidRow }) {
  return (
    <ListRow
      title={row.student.name}
      meta={row.student.code}
      subtitle={unpaidSubtitle(row)}
      onPress={openStudent(row.student.id)}
    />
  );
}

/** An open admin task; it opens its student when it has one, else it is a plain line. */
export function TaskListRow({ row }: { row: TaskRow }) {
  const { student } = row;
  return (
    <ListRow
      title={taskText(row)}
      subtitle={row.title ?? undefined}
      onPress={student ? openStudent(student.id) : undefined}
    />
  );
}
