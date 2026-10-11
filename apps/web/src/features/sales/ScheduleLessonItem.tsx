import { isOpenLesson, type SalesScheduleLesson } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { EnterButton } from '@/features/classroom/JoinButton';
import { LessonChip } from '@/features/schedule/LessonChip';
import { t } from '@/lib/i18n';

/** start <= now < end and still open: the lesson is running. */
export const isRunning = (lesson: SalesScheduleLesson, now: Date): boolean =>
  isOpenLesson(lesson.status) && Date.parse(lesson.starts_at) <= now.getTime() && now.getTime() < Date.parse(lesson.ends_at);

/**
 * One lesson in sales' read-only day: the admin's chip without its drawer (time in Riyadh, students,
 * status, «تجريبية» / «تعويضية»), and on a running lesson «جارية الآن» with «ادخل الحلقة» (she joins
 * as the classroom assistant, docs/16). No edit, cancel, move, book or report action.
 */
export function ScheduleLessonItem({ lesson, now }: { lesson: SalesScheduleLesson; now: Date }) {
  const running = isRunning(lesson, now);
  return (
    <li className="grid content-start gap-2 sm:w-56">
      <LessonChip lesson={lesson} />
      {running && (
        <div className="grid justify-items-start gap-1.5">
          <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.academySchedule.liveNow} />
          <EnterButton lesson={lesson} />
        </div>
      )}
    </li>
  );
}
