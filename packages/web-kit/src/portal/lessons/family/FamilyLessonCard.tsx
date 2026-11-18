import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useClock } from '@ab/web-kit/lib/clock';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { LessonAction } from '@ab/web-kit/portal/lessons/LessonAction';
import { LessonCountdown } from '@ab/web-kit/portal/lessons/LessonCountdown';
import { FamilyChip } from '@ab/web-kit/portal/lessons/options/FamilyChip';
import { FamilyLine } from '@ab/web-kit/portal/lessons/options/FamilyLine';
import { LessonOptionsBar } from '@ab/web-kit/portal/lessons/options/LessonOptionsBar';
import { DateTile } from './DateTile';
import { dayName, spanText, tileOf, viewerLine, withLine } from './lesson-text';
import { rowShowsTimer } from './row-clock';
import { WithRoom } from './WithRoom';

/** The countdown ticks every second; the join button turns on by itself at the window. */
const TICK_MS = 1_000;

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
}

/**
 * A later lesson in the family look (boards PortalWebHome «الحلقات القادمة»): the date tile, the
 * time span as its heading (the full day said to screen readers), «مع … · 45 دقيقة», the chip;
 * then the plain card's parts: what the family asked, the countdown (only once the way in is open:
 * row-clock.ts), the way in and «خيارات الحلقة» as pills.
 */
export function FamilyLessonCard({ lesson, student }: Props) {
  const now = useNow(TICK_MS);
  const clock = { ...useClock(), tz: student.tz };
  const viewer = viewerLine(lesson.starts_at, clock, useViewerTz());
  return (
    <WithRoom>
      {(onJoined) => (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <DateTile {...tileOf(lesson, clock)} />
            <div className="grid min-w-0 flex-1 basis-40 gap-0.5">
              <h3 className="whitespace-nowrap text-[17px] font-extrabold leading-normal text-ink">
                <span className="sr-only">{`${dayName(lesson, clock, now)} `}</span>
                {spanText(lesson, clock)}
              </h3>
              <p className="text-sm text-ink-3">{withLine(lesson)}</p>
              {viewer && <p className="text-xs text-ink-3">{viewer}</p>}
            </div>
            <FamilyChip lesson={lesson} />
          </div>
          <FamilyLine lesson={lesson} student={student} now={now} />
          {rowShowsTimer(lesson, now) && <LessonCountdown lesson={lesson} now={now} />}
          <LessonAction lesson={lesson} studentId={student.id} tz={student.tz} now={now}
            onJoined={onJoined} />
          <LessonOptionsBar lesson={lesson} student={student} now={now} />
        </div>
      )}
    </WithRoom>
  );
}
