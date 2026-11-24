import { memo } from 'react';
import type { AdminTaskView } from '@ab/money';
import { pushInTab } from '@/core/nav/back-within';
import { useTabOpen } from '@/core/auth/use-tab-open';
import { t, ListRow, StatusChip } from '@ab/mobile-kit';
import { instantDay } from '@/core/lib/money/format';
import { taskText } from './tasks';
import { useViewerTz } from '@/core/lib/clock';

/** One open admin task: the student, what is due and since when; saffron «بانتظار إجراء»; opens the student. */
export const TaskItem = memo(function TaskItem({ task }: { task: AdminTaskView }) {
  const tz = useViewerTz();
  const student = task.student;
  const toStudents = useTabOpen('students');
  return (
    <ListRow
      title={student?.name ?? taskText(task)}
      {...(student ? { meta: student.code } : {})}
      {...(student && toStudents ? { onPress: () => pushInTab(`/students/${student.id}`) } : {})}
      subtitle={`${taskText(task)} · ${instantDay(task.created_at, tz)}`}
      trailing={<StatusChip tone="act" glyph="hollow" label={t.mobileMoney.taskNeedsAction} size="sm" />}
    />
  );
});
