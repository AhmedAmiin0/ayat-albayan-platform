import type { SalesTeacherStudent } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { Ltr, StatusChip, useClock, t, useViewerTz } from '@ab/web-kit';
import { viewerWhen } from './teacher-view';

/** One student of the teacher: name, code (LTR), program, status (trial included), next lesson. */
export function TeacherStudentItem({ student }: { student: SalesTeacherStudent }) {
  const { cycle } = useClock();
  const tz = useViewerTz();
  return (
    <li className="grid gap-1 border-b border-rule py-3">
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{student.name}</span>
        <Ltr className="text-xs text-ink-3">{student.code}</Ltr>
        <StatusChip
          {...studentStatusStyle[student.status]}
          size="sm"
          label={t.enums.studentStatus[student.status]}
        />
      </span>
      <span className="text-xs text-ink-2">{t.enums.program[student.program]}</span>
      <span className="text-xs text-ink-2">
        <span className="text-ink-3">{`${t.sales.teachers.nextLesson}: `}</span>
        {student.next_lesson_at ? (
          <span className="tabular-nums">{viewerWhen(student.next_lesson_at, { cycle, tz })}</span>
        ) : (
          <span className="text-ink-3">{t.sales.teachers.noNextLesson}</span>
        )}
      </span>
    </li>
  );
}
