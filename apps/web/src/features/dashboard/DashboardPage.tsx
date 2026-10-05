import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ExportsPanel } from '@/features/exports/ExportsPanel';
import { MoneyKpis } from '@/features/finance/MoneyKpis';
import { t } from '@/lib/i18n';
import { summaryQuery, workQuery } from './api';
import { KpiStrip } from './KpiStrip';
import { PeriodSection } from './PeriodSection';
import { periodOf, riyadhToday, thisWeek, type DashboardSearch } from './search';
import type { DayRange } from './types';
import { WeekSection } from './WeekSection';
import { WorkPanel } from './WorkPanel';

export interface DashboardPageProps {
  search: DashboardSearch;
  onSearch: (next: DashboardSearch) => void;
}

/** "2026-10-02" → "2026-09": payouts are approved for the month that just ended. */
export function previousMonth(today: string): string {
  const d = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * /admin (R-RPT-01/02/03): the KPI strip and the queue it filters, this week's lessons and teacher
 * load, then the period (funnel, money by month and source, expenses) and the CSV exports. Two
 * summaries: the current Riyadh week, and the chosen period. Every number comes from the API.
 */
export function DashboardPage({ search, onSearch }: DashboardPageProps) {
  const today = riyadhToday();
  const week = thisWeek(today);
  const period = periodOf(search, today);
  const weekQ = useQuery(summaryQuery(week));
  const periodQ = useQuery(summaryQuery(period));
  const workQ = useQuery(workQuery);
  const tab = search.work ?? 'reports';
  const failed = weekQ.isError || periodQ.isError || workQ.isError;
  const onPeriod = (p: DayRange) => onSearch({ ...search, from: p.from, to: p.to });
  return (
    <>
      <PageHead>
        <Cartouche>{t.admin.dashboardTitle}</Cartouche>
      </PageHead>
      <div className="grid gap-10">
        {failed && <FormAlert>{t.dashboard.loadFailed}</FormAlert>}
        <div className="grid gap-4">
          <KpiStrip summary={weekQ.data} work={tab} />
          <MoneyKpis />
          <WorkPanel tab={tab} work={workQ.data} />
        </div>
        <WeekSection week={week} data={weekQ.data} />
        <PeriodSection period={period} onPeriod={onPeriod} data={periodQ.data} stale={periodQ.isPlaceholderData} />
        <ExportsPanel period={period} month={previousMonth(today)} />
      </div>
    </>
  );
}
