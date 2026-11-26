import { lessonClock, lessonClockText, type LessonClock } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

type Shown = LessonClock['kind'];

const TONE: Record<Shown, string> = {
  now: 'bg-ok-soft text-ok',
  opensIn: 'bg-sunk text-ink-2',
  startsIn: 'bg-act-soft text-act',
};

/** A timer, not a live region, so it is never read out every second. */
export function LessonCountdown({ lesson, now }: { lesson: PortalLesson; now: Date }) {
  const clock = lessonClock(lesson, now);
  if (!clock) return null;
  return (
    <p
      role="timer"
      className={cn(
        'justify-self-start rounded-sm px-2 py-1 text-sm font-semibold tabular-nums',
        TONE[clock.kind],
      )}
    >
      {lessonClockText(clock, t.portal)}
    </p>
  );
}
