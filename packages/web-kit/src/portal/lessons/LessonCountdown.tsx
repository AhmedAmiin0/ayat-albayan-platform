import { lessonClock, lessonClockText, type LessonClock } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';

type Shown = LessonClock['kind'];

const TONE: Record<Shown, string> = {
  now: 'bg-ok-soft text-ok',
  opensIn: 'bg-sunk text-ink-2',
  startsIn: 'bg-act-soft text-act',
};

/**
 * The live countdown to the window, then to the start; «الحلقة جارية الآن» while it runs. A timer,
 * not a live region: it is never read out every second.
 */
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
