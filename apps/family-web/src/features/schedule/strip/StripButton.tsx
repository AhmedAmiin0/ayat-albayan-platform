import { dayTile, type StripDay } from '@ab/client-core';
import { counted } from '@ab/core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { followSelected } from '@ab/web-kit/lib/motion/slide-indicator';
import { cn } from '@ab/web-kit/lib/utils';
import { dayClock, dayDate, longDay } from '@/features/schedule/day-text';

const S = t.portal.app.schedule;

const BUTTON = cn(
  'ab-press relative z-10 flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center',
  'gap-0.5 rounded-md text-ink-2 transition-[color,transform] duration-(--duration-press) ease-ink',
  'hover:not-disabled:text-ink disabled:cursor-default disabled:text-ink-3',
  'aria-[current=date]:font-bold aria-[current=date]:text-lapis',
);

/** «الأحد 16 نوفمبر: حلقتان» for the screen reader. */
const labelOf = (d: StripDay): string =>
  S.dayLabel
    .replace('{date}', longDay(d.day))
    .replace('{count}', d.count === 0 ? S.noLessons : counted(S.lessonCount, d.count));

interface StripButtonProps {
  day: StripDay;
  selected: boolean;
  onJump: (day: string) => void;
}

/** One day of the strip: short weekday over the day number, a dot when it has lessons. */
export function StripButton({ day, selected, onJump }: StripButtonProps) {
  const tile = dayTile(dayDate(day.day), dayClock, 'short');
  return (
    <button
      type="button"
      ref={selected ? followSelected : undefined}
      aria-label={labelOf(day)}
      aria-current={day.today ? 'date' : undefined}
      aria-pressed={selected}
      disabled={day.count === 0}
      onClick={() => onJump(day.day)}
      className={BUTTON}
    >
      <span className="text-2xs">{tile.weekday}</span>
      <span className="text-sm font-semibold tabular-nums">{tile.day}</span>
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', day.count > 0 ? 'bg-lapis' : 'bg-transparent')}
      />
    </button>
  );
}
