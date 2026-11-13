import { type LessonView, lessonWhenAt } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/form/button';
import { studentNames } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';

export interface NextLessonProps {
  /** nextOpenLesson over the home's window (14 days ahead), or null. */
  next: LessonView | null;
  tz: string;
}

/** «حلقتك القادمة: الأحد 16 نوفمبر 4:00 م · يوسف» (or none in two weeks) and «افتح جدولي». */
export function NextLesson({ next, tz }: NextLessonProps) {
  const clock = useClock();
  const line = next
    ? t.teacherDash.nextOn
        .replace('{when}', lessonWhenAt(new Date(next.starts_at), { tz, ...clock }))
        .replace('{names}', studentNames(next))
    : t.teacherDash.noneSoon;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <p className="min-w-0 text-sm text-ink-2">{line}</p>
      <Link to="/teacher/calendar" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
        {t.teacherDash.openSchedule}
      </Link>
    </div>
  );
}
