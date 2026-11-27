import { reportMonths } from '@ab/client-core';
import { localDateIn } from '@ab/time';
import { useNow } from '@ab/mobile-kit';
import type { ReportMonthsProps } from './ReportMonths.types';

export function useReportMonths({ reports, student }: ReportMonthsProps) {
  const thisMonth = localDateIn(useNow(), student.tz).slice(0, 7);
  const months = reportMonths(reports, student.tz);
  const count = months.find((m) => m.month === thisMonth)?.rows.length ?? 0;
  return { months, count, empty: months.length === 0 };
}
