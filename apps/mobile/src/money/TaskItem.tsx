import type { AdminTaskView } from '@ab/shared';
import { router } from 'expo-router';
import { useTabOpen } from '@/auth/use-tab-open';
import { t } from '@/lib/i18n';
import { instantDay } from '@/payments/format';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import { taskText } from './tasks';

/** One open admin task: the student, what is due and since when; saffron «بانتظار إجراء»; opens the student. */
export function TaskItem({ task }: { task: AdminTaskView }) {
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
}
