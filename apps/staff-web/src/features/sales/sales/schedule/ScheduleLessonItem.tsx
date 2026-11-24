import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { LessonChip } from '@/features/teaching/schedule/lesson/LessonChip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { otherDayNote } from './other-day';
import { SalesLessonDrawer } from './SalesLessonDrawer';

/** She joins a running lesson as the classroom assistant (docs/16); nothing here edits. */
export function ScheduleLessonItem({ lesson, now }: { lesson: SalesScheduleLesson; now: Date }) {
  const running = isRunningLesson(lesson, now);
  const [open, setOpen] = useState(false);
  const tz = useViewerTz();
  const other = otherDayNote(lesson.starts_at, tz);
  return (
    <li className="grid content-start gap-2 sm:w-56">
      {other && <span className="text-xs text-ink-3">{other}</span>}
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
