import type { SalesTeacherView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { usePlatformClassroom } from '@ab/web-kit/lib/settings/public-config';
import { programList } from './teacher-view';
import { TeacherMeetingLink } from './TeacherMeetingLink';
import { TeacherStudentsByKind } from './TeacherStudentsByKind';

/** Never pay, rates or phone (the API omits them); the fixed link is the one sales exception. */
export function TeacherDetail({ teacher }: { teacher: SalesTeacherView }) {
  const { students } = teacher;
  const platform = usePlatformClassroom(teacher.platform_classroom);
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
      <TeacherMeetingLink link={teacher.meeting_link} platform={platform} />
      <TeacherStudentsByKind teacher={teacher} />
    </>
  );
}
