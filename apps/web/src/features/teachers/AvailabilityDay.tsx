import type { Weekday } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { addRange, dayProblem, removeRange, updateRange, type Range } from './grid';

type Props = { day: Weekday; ranges: Range[]; onChange: (ranges: Range[]) => void };

const PROBLEM_TEXT = {
  endBeforeStart: t.common.endBeforeStart,
  overlap: t.availability.overlap,
} as const;

/** One weekday row of the availability grid: its time ranges + add/remove. R-TCH-02. */
export function AvailabilityDay({ day, ranges, onChange }: Props) {
  const dayName = t.enums.weekday[day];
  const problem = dayProblem(ranges);

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 sm:flex-row sm:items-start">
      <span className="w-24 shrink-0 pt-2 font-medium">{dayName}</span>
      <div className="flex flex-1 flex-col gap-2">
        {ranges.map((range, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="time"
              dir="ltr"
              className="w-32"
              aria-label={`${dayName} ${t.availability.from}`}
              value={range.start}
              onChange={(e) => onChange(updateRange(ranges, i, { start: e.target.value }))}
            />
            <span>{t.availability.to}</span>
            <Input
              type="time"
              dir="ltr"
              className="w-32"
              aria-label={`${dayName} ${t.availability.to}`}
              value={range.end}
              onChange={(e) => onChange(updateRange(ranges, i, { end: e.target.value }))}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`${t.availability.removeSlot} ${dayName}`}
              onClick={() => onChange(removeRange(ranges, i))}
            >
              {t.availability.removeSlot}
            </Button>
          </div>
        ))}
        {problem && (
          <p role="alert" className="text-sm text-destructive">
            {PROBLEM_TEXT[problem]}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`${t.availability.addSlot} ${dayName}`}
        onClick={() => onChange(addRange(ranges))}
      >
        {t.availability.addSlot}
      </Button>
    </li>
  );
}
