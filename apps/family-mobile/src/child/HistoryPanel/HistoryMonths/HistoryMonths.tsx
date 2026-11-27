import { historyMonths, historyRows } from '@ab/client-core';
import { EmptyState } from '@ab/mobile-kit';
import { MonthSection } from '@/ui';
import { HistoryRow } from '@/child/HistoryRow';
import { EMPTY } from './history-months.helpers';
import type { HistoryMonthsProps } from './HistoryMonths.types';

/** The loaded pages under their months, or the empty note. */
export function HistoryMonths({ pages, student, status }: HistoryMonthsProps) {
  const months = historyMonths(historyRows(pages, status), student.tz);
  if (months.length === 0) return <EmptyState title={EMPTY[status]()} />;
  return months.map(({ month, rows }) => (
    <MonthSection key={month} month={month}>
      {rows.map((row) => (
        <HistoryRow key={row.lesson_id} row={row} student={student} />
      ))}
    </MonthSection>
  ));
}
