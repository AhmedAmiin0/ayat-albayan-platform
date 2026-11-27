import { HistoryRow } from '@ab/web-kit/portal/history/HistoryRow';
import type { HistoryMonthsProps } from './HistoryMonths.types';
import { monthName } from './history-months.helpers';

export function HistoryMonths({ months, student, more, ...open }: HistoryMonthsProps) {
  return (
    <div className="grid gap-5">
      {months.map(({ month, rows }) => (
        <section key={month} aria-label={monthName(month)} className="grid gap-2">
          <h3 className="text-sm font-semibold text-ink-2">{monthName(month)}</h3>
          <ul className="grid gap-3">
            {rows.map((row) => (
              <HistoryRow key={row.lesson_id} row={row} student={student} {...open} />
            ))}
          </ul>
        </section>
      ))}
      {more}
    </div>
  );
}
