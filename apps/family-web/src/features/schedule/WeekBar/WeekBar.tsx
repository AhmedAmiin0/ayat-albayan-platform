import { Icon, Button } from '@ab/web-kit';
import { rangeOf } from '@/features/schedule/day-text';
import { MAX_OFFSET } from '@/features/schedule/use-week';
import type { WeekBarProps } from './WeekBar.types';
import { S, WEEK_WORD, STEP } from './week-bar.helpers';

/** Within the lessons the API sends; chevrons follow the reading direction. */
export function WeekBar({ week }: WeekBarProps) {
  const word = WEEK_WORD[week.offset] ?? WEEK_WORD[0];
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-sunk p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={STEP}
        aria-label={S.prev}
        disabled={week.offset === 0}
        onClick={() => week.setOffset(week.offset - 1)}
      >
        <Icon name="chevron-right" />
      </Button>
      <p aria-live="polite" className="grid text-center">
        <span className="text-sm font-semibold">{word?.()}</span>
        <span className="text-xs text-ink-2 tabular-nums">{rangeOf(week.range)}</span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={STEP}
        aria-label={S.next}
        disabled={week.offset >= MAX_OFFSET}
        onClick={() => week.setOffset(week.offset + 1)}
      >
        <Icon name="chevron-left" />
      </Button>
    </div>
  );
}
