import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { sectionTitle } from './shared/Bar';
import { ExpensesByCategory } from './finance/ExpensesByCategory';
import { FinanceByMonth } from './finance/FinanceByMonth';
import { FinanceTotals } from './finance/FinanceTotals';
import { FunnelChart } from './funnel/FunnelChart';
import { PeriodFilter } from './PeriodFilter';
import { SourceTable } from './funnel/SourceTable';
import type { DashboardData, DayRange } from './types';

export interface PeriodSectionProps {
  period: DayRange;
  onPeriod: (next: DayRange) => void;
  data: DashboardData | undefined;
  /** A refetch for a new period: keep the old numbers, dimmed (no flash, no layout jump). */
  stale: boolean;
}

const sub = 'text-sm font-semibold text-ink-2';

/** The period block: one filter row, then funnel, money by month / source, and expenses (R-RPT-01/02). */
export function PeriodSection({ period, onPeriod, data, stale }: PeriodSectionProps) {
  return (
    <section aria-labelledby="dash-period" className="grid grid-cols-1 gap-5">
      <header className="grid grid-cols-1 gap-3">
        <h2 id="dash-period" className={sectionTitle}>
          {t.dashboard.range}
        </h2>
        <PeriodFilter key={`${period.from}_${period.to}`} value={period} onChange={onPeriod} />
      </header>
      {data ? (
        <div className={cn('grid grid-cols-1 gap-8 transition-opacity', stale && 'opacity-60')} aria-busy={stale || undefined}>
          <div className="grid grid-cols-1 gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-1 content-start gap-2">
              <h3 className={sub}>
                {t.dashboard.funnel}
                <span className="ms-3 font-normal text-ink-3">
                  {t.dashboard.activeStudents}: <span className="font-semibold tabular-nums text-ink">{data.active_students}</span>
                </span>
              </h3>
              <FunnelChart funnel={data.funnel} />
            </div>
            <div className="grid grid-cols-1 content-start gap-2">
              <h3 className={sub}>{t.dashboard.expensesByCategory}</h3>
              <ExpensesByCategory byCategory={data.finance.expenses_by_category} />
            </div>
          </div>
          <FinanceTotals finance={data.finance} />
          <div className="grid grid-cols-1 gap-2">
            <h3 className={sub}>{t.dashboard.byMonth}</h3>
            <FinanceByMonth months={data.finance.by_month} currency={data.finance.currency} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <h3 className={sub}>{t.dashboard.bySource}</h3>
            <SourceTable rows={data.finance.by_source} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
    </section>
  );
}
