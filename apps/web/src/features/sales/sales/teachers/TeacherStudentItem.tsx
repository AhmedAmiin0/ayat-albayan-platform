import { studentStatusStyle, type SalesTeacherStudent } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { riyadhWhen } from './teacher-view';

/** One student of the teacher: name, code (LTR island), program, status (trial included), next lesson. */
export function TeacherStudentItem({ student }: { student: SalesTeacherStudent }) {
  const { cycle } = useClock();
  return (
    <li className="grid gap-1 border-b border-rule py-3">
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{student.name}</span>
        <Ltr className="text-xs text-ink-3">{student.code}</Ltr>
        <StatusChip {...studentStatusStyle[student.status]} size="sm" label={t.enums.studentStatus[student.status]} />
      </span>
      <span className="text-xs text-ink-2">{t.enums.program[student.program]}</span>
      <span className="text-xs text-ink-2">
        <span className="text-ink-3">{`${t.sales.teachers.nextLesson}: `}</span>
        {student.next_lesson_at ? (
          <span className="tabular-nums">{riyadhWhen(student.next_lesson_at, cycle)}</span>
        ) : (
          <span className="text-ink-3">{t.sales.teachers.noNextLesson}</span>
        )}
      </span>
    </li>
  );
}
