import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { Drawer } from '@/features/teaching/schedule/Drawer';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { t } from '@/lib/i18n/i18n';
import { SalesLessonDetails } from './SalesLessonDetails';

export interface SalesLessonDrawerProps {
  lesson: SalesScheduleLesson;
  now: Date;
  onClose: () => void;
}

/**
 * The read-only version of the admin lesson drawer for sales (owner 2026-10-26): the same panel and
 * details, and on a running lesson «جارية الآن» with «ادخل الحلقة» (she joins as the classroom
 * assistant, docs/16). No edit, cancel, move, invoice or report action. Render it conditionally.
 */
export function SalesLessonDrawer({ lesson, now, onClose }: SalesLessonDrawerProps) {
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      <div role="group" aria-label={t.lessons.details} className="grid gap-5">
        <SalesLessonDetails lesson={lesson} />
        {isRunningLesson(lesson, now) && (
          <div className="grid justify-items-start gap-1.5">
            <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.academySchedule.liveNow} />
            <EnterButton lesson={lesson} />
          </div>
        )}
        <p className="text-xs text-ink-3">{t.lessons.sheet.readOnly}</p>
      </div>
    </Drawer>
  );
}
