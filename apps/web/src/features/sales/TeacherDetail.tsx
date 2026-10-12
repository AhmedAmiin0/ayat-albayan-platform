import type { SalesTeacherView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { programList } from './teacher-view';
import { TeacherStudentItem } from './TeacherStudentItem';

/**
 * The drawer of one teacher in «المعلمون»: who they are, today's lessons, a link to their day in the
 * read-only schedule, then their students as a list. Never pay, rates, phone or meeting link (the API
 * does not send them).
 */
export function TeacherDetail({ teacher }: { teacher: SalesTeacherView }) {
  const { students } = teacher;
  return (
    <>
      <div className="grid gap-2">
        <p className="text-sm text-ink-2">{`${t.teachers.genderLabel[teacher.gender]} · ${programList(teacher)}`}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
          <span>{t.sales.teachers.studentsCount.replace('{n}', String(students.length))}</span>
          <span>{t.sales.teachers.lessonsToday.replace('{n}', String(teacher.lessons_today))}</span>
          {teacher.live_now && <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} />}
        </p>
        <Link
          to="/sales/schedule"
          search={{ teacherId: teacher.id }}
          className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'justify-self-start' })}
        >
          <Icon name="calendar" />
          {t.sales.teachers.openSchedule}
        </Link>
      </div>
      <section aria-label={t.sales.teachers.students} className="grid gap-1">
        <h3 className="flex items-baseline justify-between gap-2 font-semibold">
          {t.sales.teachers.students}
          <span className="text-xs font-normal text-ink-3">{t.schedule.riyadhTime}</span>
        </h3>
        {students.length === 0 ? (
          <p className="text-sm text-ink-3">{t.sales.teachers.noStudents}</p>
        ) : (
          <ul className="border-t border-rule">
            {students.map((s) => (
              <TeacherStudentItem key={s.id} student={s} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
