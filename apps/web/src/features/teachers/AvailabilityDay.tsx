import type { Weekday } from '@ab/shared';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { DayTrack } from './DayTrack';
import { addRange, dayProblem, problemIndex, removeRange, updateRange, type Range } from './grid';
import { RangeRow } from './RangeRow';

/** Shared by the header row and every day row so the columns line up (container queries). */
export const weekRowClass =
  'grid grid-cols-1 @min-[640px]:grid-cols-[92px_minmax(0,1fr)] @min-[1000px]:grid-cols-[92px_452px_minmax(0,1fr)]';
export const cellClass = 'flex min-w-0 items-center px-0 py-1.5 @min-[640px]:px-2.5 @min-[640px]:py-[9px]';
export const trackCellClass = cn(cellClass, 'pb-3 @min-[640px]:col-start-2 @min-[1000px]:col-start-3 @min-[1000px]:row-start-1');

type Props = {
  day: Weekday;
  ranges: Range[];
  /** Minute of the day when this row is today (in the grid tz), else null. */
  now: number | null;
  onChange: (ranges: Range[]) => void;
};

const PROBLEM_TEXT = {
  endBeforeStart: t.common.endBeforeStart,
  overlap: t.availability.overlap,
} as const;

/** One weekday row: ranges as selects + add/remove, the 08–24 track, and its error line. R-TCH-02. */
export function AvailabilityDay({ day, ranges, now, onChange }: Props) {
  const dayName = t.enums.weekday[day];
  const errorId = useId();
  const problem = dayProblem(ranges);
  const bad = problemIndex(ranges);
  const invalid = problem === 'endBeforeStart' ? 'end' : 'start';
  const addLabel = `${t.availability.addSlot} ${dayName}`;

  return (
    <div
      role="row"
      className={cn(
        weekRowClass,
        'border-t border-rule',
        problem ? '@min-[640px]:bg-danger-soft/55' : now !== null && '@min-[640px]:bg-gold-wash/40',
      )}
    >
      <div
        role="rowheader"
        className={cn(cellClass, 'gap-2 pt-3 font-semibold @min-[640px]:flex-col @min-[640px]:items-start @min-[640px]:justify-center @min-[640px]:gap-0 @min-[640px]:leading-tight')}
      >
        <span>{dayName}</span>
        {now !== null && <span className="text-2xs font-semibold text-ink-3">{t.availability.today}</span>}
      </div>
      <div role="cell" className={cn(cellClass, 'flex-wrap gap-x-2.5 gap-y-1.5')}>
        {ranges.map((range, i) => (
          <RangeRow
            key={i}
            dayName={dayName}
            range={range}
            invalid={problem && i === bad ? invalid : null}
            errorId={errorId}
            onChange={(patch) => onChange(updateRange(ranges, i, patch))}
            onRemove={() => onChange(removeRange(ranges, i))}
          />
        ))}
        {ranges.length === 0 ? (
          <>
            <span className="me-1.5 text-xs text-ink-3">{t.availability.empty}</span>
            <Button variant="ghost" size="sm" aria-label={addLabel} onClick={() => onChange(addRange(ranges))}>
              <Icon name="plus" />
              {t.availability.addSlot}
            </Button>
          </>
        ) : (
          <IconButton
            label={addLabel}
            className="size-[30px] border border-dashed border-rule-strong text-lapis"
            onClick={() => onChange(addRange(ranges))}
          >
            <Icon name="plus" />
          </IconButton>
        )}
        {problem && (
          <p id={errorId} role="alert" className="flex basis-full items-center gap-1.5 text-xs text-danger">
            <NuqtaGlyph shape="struck" />
            <span>{PROBLEM_TEXT[problem]}</span>
          </p>
        )}
      </div>
      <div aria-hidden="true" className={trackCellClass}>
        <DayTrack ranges={ranges} now={now} />
      </div>
    </div>
  );
}
