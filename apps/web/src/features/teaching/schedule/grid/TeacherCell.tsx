import { sameClockAt, type OverviewTeacher } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Avatar } from '@/components/ui/display/avatar';
import { Bar } from '@/features/reporting/dashboard/shared/Bar';
import { loadLabel } from '@/features/reporting/dashboard/today/TeacherLoad';
import { formatTimeOff } from '@/features/people/teachers/time-off/time-off';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { timeInCity } from '../lesson/lessons';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface TeacherCellProps {
  teacher: OverviewTeacher;
  /** For the teacher's own clock when it reads differently from the viewer's. */
  now: Date;
  /** The teacher's photo (BoardRow.photo); absent = initials. */
  photo?: string | null;
}

/**
 * The teacher at the head of a calendar row (R-SCH-01): photo + name → profile, «معلمة · القرآن الكريم»,
 * their own clock when it differs from the viewer's, the load «4 من 10» as a neutral meter (a full
 * teacher is not the admin's work, so no saffron), and any time off in the window as one
 * marginal note each.
 */
export function TeacherCell({ teacher, now, photo }: TeacherCellProps) {
  const clock = useClock();
  const own = !sameClockAt(now, { a: teacher.tz, b: useViewerTz() });
  const programs = teacher.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
  const load = { students: teacher.students_count, max_students: teacher.max_students };
  return (
    <div className="grid min-w-0 gap-1 text-start">
      <Link
        to="/admin/teachers/$teacherId"
        params={{ teacherId: teacher.id }}
        className="flex min-h-11 min-w-0 items-center gap-2 font-semibold text-ink hover:text-lapis sm:min-h-0"
      >
        <Avatar name={teacherLabel(teacher)} id={teacher.id} src={photo} size="sm" decorative />
        <span className="truncate">{teacherLabel(teacher)}</span>
      </Link>
      <span className="text-xs font-normal text-ink-3">{`${t.teachers.genderLabel[teacher.gender]} · ${programs}`}</span>
      {own && (
        <span className="text-2xs font-normal text-ink-3">
          {t.schedule.teacherTime.replace('{time}', timeInCity(now.toISOString(), teacher.tz, clock))}
        </span>
      )}
      <span className="flex items-center gap-2 text-2xs font-normal text-ink-2">
        <span className="relative block h-2.5 min-w-12 flex-1 rounded-e-[4px] bg-rule">
          <Bar value={load.students} max={load.max_students ?? load.students} className="absolute inset-0" />
        </span>
        <span className="tabular-nums">{loadLabel(load)}</span>
      </span>
      {teacher.time_off.map((off) => (
        <span key={off.id} className="border-s-2 border-danger ps-1.5 text-2xs font-normal text-ink-2">
          {[t.schedule.dayOff, formatTimeOff(off.starts_at, off.ends_at, clock), off.reason].filter(Boolean).join(' · ')}
        </span>
      ))}
    </div>
  );
}
