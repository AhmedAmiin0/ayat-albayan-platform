import { Dot, t } from '@ab/web-kit';
import { LABEL, LINE } from '@/features/children/SummaryFigures/summary-figures.helpers';
import type { MonthDotsProps } from './MonthDots.types';

export function MonthDots({ month }: MonthDotsProps) {
  return (
    <p className={LINE}>
      <span className={LABEL}>{t.portal.thisMonth}</span>
      <Dot tone="ok" className="tabular-nums">
        {t.portal.monthAttended.replace('{n}', String(month.attended))}
      </Dot>
      <Dot tone="neutral" className="tabular-nums">
        {t.portal.monthAbsent.replace('{n}', String(month.absent))}
      </Dot>
    </p>
  );
}
