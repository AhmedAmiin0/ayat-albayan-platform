import { clockParts, lessonClock, type CountdownParts, type LessonClock } from '@ab/client-core';
import { counted, type PortalLesson } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

/** «يومان 03:15:20», or just «03:15:20» under a day (Western digits). */
const leftText = (parts: CountdownParts): string =>
  parts.days > 0 ? `${counted(t.portal.days, parts.days)} ${clockParts(parts)}` : clockParts(parts);

type Shown = LessonClock['kind'];
type Counting = Exclude<Shown, 'now'>;

const COUNTING: Record<Counting, () => string> = {
  opensIn: () => t.portal.opensIn,
  startsIn: () => t.portal.startsIn,
};

function clockText(clock: LessonClock): string {
  if (clock.kind === 'now') return t.portal.now;
  return COUNTING[clock.kind]().replace('{time}', leftText(clock.parts));
}

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
      {clockText(clock)}
    </p>
  );
}
