import type { TeacherStudentView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { nextLessonText } from './next-lesson';

/** One of my students: name (opens the report history), code, program, level, age, next lesson. */
export function StudentRow({ student: s }: { student: TeacherStudentView }) {
  const facts = [
    t.enums.program[s.program],
    s.level,
    s.age === null ? null : t.teacherStudents.age.replace('{n}', String(s.age)),
  ].filter((f): f is string => !!f);
  return (
    <li className="grid gap-0.5 border-b border-rule py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          to="/teacher/reports/$studentId"
          params={{ studentId: s.id }}
          title={t.teacherStudents.openReports.replace('{name}', s.name)}
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4"
        >
          {s.name}
        </Link>
        <Ltr className="text-sm text-ink-2">{s.code}</Ltr>
      </div>
      <p className="text-sm text-ink-2">{facts.join(' · ')}</p>
      <p className="text-xs text-ink-3">{nextLessonText(s.next_lesson_at)}</p>
    </li>
  );
}
