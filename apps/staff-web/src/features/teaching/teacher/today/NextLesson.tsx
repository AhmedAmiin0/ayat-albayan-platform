import { lessonWhenAt } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { Link } from '@tanstack/react-router';
import { buttonVariants, t, useClock } from '@ab/web-kit';
import { studentNames } from '@/features/teaching/schedule';

export interface NextLessonProps {
  /** nextOpenLesson over the home's window (14 days ahead), or null. */
  next: LessonView | null;
  tz: string;
}

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
