import type { PortalLesson, PortalStudent } from '@ab/shared';
import { DateTile } from '@ab/web-kit/components/family/layout/DateTile';
import { FamilyChip } from '@ab/web-kit/portal/lessons/options/FamilyChip';
import { LessonActs } from '@ab/web-kit/portal/lessons/LessonActs';
import { WithRoom } from '@ab/web-kit/portal/lessons/WithRoom';
import { dayName, spanText, withLine } from './lesson-text';
import { rowShowsTimer } from './row-clock';
import { useCardClock } from './use-card-clock';

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
  const { now, clock, viewer } = useCardClock(lesson, student);
  return (
    <WithRoom>
      {(onJoined) => (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <DateTile at={lesson.starts_at} tz={student.tz} />
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
          <LessonActs lesson={lesson} student={student} now={now} onJoined={onJoined}
            timer={rowShowsTimer(lesson, now)} />
        </div>
      )}
    </WithRoom>
  );
}
