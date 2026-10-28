import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { StatusChip } from '@/components/ui/display/status-chip';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { LessonChip } from '@/features/teaching/schedule/lesson/LessonChip';
import { t } from '@/lib/i18n/i18n';
import { SalesLessonDrawer } from './SalesLessonDrawer';

/**
 * One lesson in sales' read-only day: the admin's chip (time in Riyadh, students, status, «تجريبية» /
 * «تعويضية») opening the read-only lesson drawer, and on a running lesson «جارية الآن» with «ادخل
 * الحلقة» (she joins as the classroom assistant, docs/16). No edit, cancel, move, book or report action.
 */
export function ScheduleLessonItem({ lesson, now }: { lesson: SalesScheduleLesson; now: Date }) {
  const running = isRunningLesson(lesson, now);
  const [open, setOpen] = useState(false);
  return (
    <li className="grid content-start gap-2 sm:w-56">
      <LessonChip lesson={lesson} onOpen={() => setOpen(true)} />
      {open && <SalesLessonDrawer lesson={lesson} now={now} onClose={() => setOpen(false)} />}
      {running && (
        <div className="grid gap-1.5">
          <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.academySchedule.liveNow} className="justify-self-start" />
          <EnterButton lesson={lesson} className="justify-items-stretch" />
        </div>
      )}
    </li>
  );
}
