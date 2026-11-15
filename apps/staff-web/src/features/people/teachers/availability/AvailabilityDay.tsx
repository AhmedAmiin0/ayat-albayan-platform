import type { Weekday } from '@ab/shared';
import { useId, useState, type FocusEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { useClock, type Clock } from '@/lib/clock';
import { hhmmText } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { DayTrack } from './DayTrack';
import { addRange, dayProblem, problemIndex, removeRange, updateRange, type Range } from './grid';
import { RangeRow } from './RangeRow';
import { overlaps } from './track';

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

/** The error line, in ONE inline run (docs/07 §14.3): «… من 17:30 لحد 18:00» for an overlap. */
function problemText(problem: 'endBeforeStart' | 'overlap', ranges: readonly Range[], clock: Clock): string {
  if (problem === 'endBeforeStart') return t.common.endBeforeStart;
  const clash = overlaps(ranges)[0];
  if (!clash) return t.availability.overlap;
  const span = t.availability.overlapSpan.replace('{from}', hhmmText(clash.start, clock)).replace('{to}', hhmmText(clash.end, clock));
  return `${t.availability.overlap}${t.common.listSeparator}${span}`;
}

/** One weekday row: ranges as selects + add/remove, the 08–24 track, and its error line. R-TCH-02. */
export function AvailabilityDay({ day, ranges, now, onChange }: Props) {
  const dayName = t.enums.weekday[day];
  const errorId = useId();
  const clock = useClock();
  const problem = dayProblem(ranges);
  const bad = problemIndex(ranges);
  const invalid = problem === 'endBeforeStart' ? 'end' : 'start';
  const addLabel = `${t.availability.addSlot} ${dayName}`;
  const [editing, setEditing] = useState<number | null>(null);
  // Focus moving between the two selects of one range must not clear the band.
  const leave = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setEditing(null);
  };

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
          <span key={i} className="contents" onFocus={() => setEditing(i)} onBlur={leave}>
            <RangeRow
              dayName={dayName}
              range={range}
              invalid={problem && i === bad ? invalid : null}
              errorId={errorId}
              onChange={(patch) => onChange(updateRange(ranges, i, patch))}
              onRemove={() => {
                setEditing(null);
                onChange(removeRange(ranges, i));
              }}
            />
          </span>
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
            className="size-11 border border-dashed border-input text-lapis sm:size-[30px]"
            onClick={() => onChange(addRange(ranges))}
          >
            <Icon name="plus" />
          </IconButton>
        )}
        {problem && (
          <p id={errorId} role="alert" className="flex basis-full items-center gap-1.5 text-xs text-danger">
            <NuqtaGlyph shape="struck" />
            <span>{problemText(problem, ranges, clock)}</span>
          </p>
        )}
      </div>
      <div aria-hidden="true" className={trackCellClass}>
        <DayTrack ranges={ranges} now={now} editing={editing} />
      </div>
    </div>
  );
}
