import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { EnterButton } from '@/features/classroom/join/JoinButton';
import { LessonChip } from '@/features/schedule/lesson/LessonChip';
import { t } from '@/lib/i18n/i18n';

/**
 * One lesson in sales' read-only day: the admin's chip without its drawer (time in Riyadh, students,
 * status, «تجريبية» / «تعويضية»), and on a running lesson «جارية الآن» with «ادخل الحلقة» (she joins
 * as the classroom assistant, docs/16). No edit, cancel, move, book or report action.
 */
export function ScheduleLessonItem({ lesson, now }: { lesson: SalesScheduleLesson; now: Date }) {
  const running = isRunningLesson(lesson, now);
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
