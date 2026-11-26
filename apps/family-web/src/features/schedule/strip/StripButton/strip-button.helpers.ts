import type { StripDay } from '@ab/client-core';
import { counted } from '@ab/core';
import { t, cn } from '@ab/web-kit';
import { longDay } from '@/features/schedule/day-text';

export const S = t.portal.app.schedule;

export const BUTTON = cn(
  'ab-press relative z-10 flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center',
  'gap-0.5 rounded-md text-ink-2 transition-[color,transform] duration-(--duration-press) ease-ink',
  'hover:not-disabled:text-ink disabled:cursor-default disabled:text-ink-3',
  'aria-[current=date]:font-bold aria-[current=date]:text-lapis',
);

export const labelOf = (d: StripDay): string =>
  S.dayLabel
    .replace('{date}', longDay(d.day))
    .replace('{count}', d.count === 0 ? S.noLessons : counted(S.lessonCount, d.count));
