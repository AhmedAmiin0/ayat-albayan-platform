import { memo } from 'react';
import type { AdminTaskView } from '@ab/shared';
import { router } from 'expo-router';
import { useTabOpen } from '@/auth/use-tab-open';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { taskText } from './tasks';

/** One open admin task: the student, what is due and since when; saffron «بانتظار إجراء»; opens the student. */
export const TaskItem = memo(function TaskItem({ task }: { task: AdminTaskView }) {
  const student = task.student;
  const toStudents = useTabOpen('students');
  return (
    <ListRow
      title={student?.name ?? taskText(task)}
      {...(student ? { meta: student.code } : {})}
      {...(student && toStudents ? { onPress: () => router.push(`/students/${student.id}`) } : {})}
      subtitle={`${taskText(task)} · ${instantDay(task.created_at)}`}
      trailing={<StatusChip tone="act" glyph="hollow" label={t.mobileMoney.taskNeedsAction} size="sm" />}
    />
  );
});
