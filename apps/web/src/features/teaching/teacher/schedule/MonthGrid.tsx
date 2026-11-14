import { monthCells, type MonthDayView } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { dayCellLabel, dayNumber, weekdayHead } from './month-text';

export interface MonthGridProps {
  month: string;
  today: string;
  /** The picked day (its lessons show under the grid). */
  picked: string | null;
  /** Her lessons by local day (lessonsByDay). */
  days: ReadonlyMap<string, readonly LessonView[]>;
  onPick: (date: string) => void;
}

const CELL =
  'flex min-h-11 w-full flex-col items-center justify-start gap-1 rounded-md px-0.5 py-1 ' +
  'text-sm transition-colors hover:bg-sunk sm:min-h-16';

/**
 * The month as whole weeks السبت → الجمعة (owner 2026-11-14): each day a 44px button with its
 * number and a count of her lessons; today ringed, the picked day filled, borrowed days muted.
 */
export function MonthGrid({ month, today, picked, days, onPick }: MonthGridProps) {
  const weeks = monthCells(month, { today, picked, days });
  return (
    <table aria-label={t.teacherSchedule.monthGrid} className="w-full table-fixed border-collapse">
      <thead>
        <tr>
          {(weeks[0] ?? []).map((cell) => (
            <WeekdayHead key={cell.date} date={cell.date} />
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]?.date}>
            {week.map((cell) => (
              <td key={cell.date} className="p-0.5 align-top">
                <DayCell cell={cell} onPick={onPick} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WeekdayHead({ date }: { date: string }) {
  const head = weekdayHead(date);
  return (
    <th scope="col" abbr={head.long} className="py-1.5 text-xs font-semibold text-ink-3">
      <span aria-hidden="true" className="sm:hidden">{head.narrow}</span>
      <span className="max-sm:sr-only">{head.long}</span>
    </th>
  );
}

function DayCell({ cell, onPick }: { cell: MonthDayView; onPick: (date: string) => void }) {
  return (
    <button
      type="button"
      aria-label={dayCellLabel(cell.date, cell.count)}
      aria-pressed={cell.picked}
      aria-current={cell.today ? 'date' : undefined}
      onClick={() => onPick(cell.date)}
      className={cn(
        CELL,
        !cell.inMonth && 'text-ink-3',
        cell.today && 'ring-1 ring-gold',
        cell.picked && 'bg-lapis-wash font-semibold text-ink',
      )}
    >
      <span className="tabular-nums">{dayNumber(cell.date)}</span>
      {cell.count > 0 && (
        <span className="rounded-full bg-gold-wash px-1.5 text-2xs font-semibold text-ink tabular-nums">
          {cell.count}
        </span>
      )}
    </button>
  );
}
