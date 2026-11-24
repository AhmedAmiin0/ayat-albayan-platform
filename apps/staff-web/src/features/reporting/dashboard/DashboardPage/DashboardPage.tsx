import { addCalendarMonths } from '@ab/time';
import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { adminDayQuery, dayAround } from '@ab/web-kit/classroom/api/api';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { ExportsPanel } from '@/features/reporting/exports/ExportsPanel';
import { MoneyKpis } from '@/features/finance/finance/MoneyKpis';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useJoinWindow } from '@ab/web-kit/lib/settings/public-config';
import { summaryQuery, workQuery } from '@/features/reporting/dashboard/api';
import { KpiStrip } from '@/features/reporting/dashboard/funnel/KpiStrip';
import { PeriodSection } from '@/features/reporting/dashboard/PeriodSection';
import { QuickActions } from '@/features/reporting/dashboard/work/QuickActions';
import { RecentInbox } from '@/features/reporting/dashboard/work/RecentInbox';
import { periodOf, riyadhToday, thisWeek, type DashboardSearch } from '@/features/reporting/dashboard/search';
import { todayCounts } from '@/features/reporting/dashboard/today/today';
import { TodayKpis } from '@/features/reporting/dashboard/today/TodayKpis';
import { TodayLessons } from '@/features/reporting/dashboard/today/TodayLessons';
import type { DayRange } from '@/features/reporting/dashboard/search';
import { WeekSection } from '@/features/reporting/dashboard/today/WeekSection';
import { WorkPanel } from '@/features/reporting/dashboard/work/WorkPanel';

export interface DashboardPageProps {
  search: DashboardSearch;
  onSearch: (next: DashboardSearch) => void;
}

/** "2026-10-02" → "2026-09": payouts are approved for the month that just ended. */
export function previousMonth(today: string): string {
  return addCalendarMonths(today, -1).slice(0, 7);
}

const card = 'rounded-md border border-rule p-4';

/**
 * /admin (R-RPT-01/02/03; owner 2026-10-05 «enhance the main dashboard»): quick actions, today's
 * four numbers, then a grid (1 column on phones, 2 on tablets, 3 on desktops) of today's lessons,
 * the work queue and the latest messages; below them this week, the period and the CSV exports.
 * Every number comes from the API.
 */
export function DashboardPage({ search, onSearch }: DashboardPageProps) {
  const now = useNow();
  const win = useJoinWindow();
  const today = riyadhToday(); // academy day (docs/34 b): the period's ?from&to are Riyadh days
  const week = thisWeek(today);
  const period = periodOf(search, today);
  const weekQ = useQuery(summaryQuery(week));
  const periodQ = useQuery(summaryQuery(period));
  const workQ = useQuery(workQuery);
  const dayQ = useQuery(adminDayQuery(dayAround(now, 0)));
  const tab = search.work ?? 'reports';
  const failed = weekQ.isError || periodQ.isError || workQ.isError;
  const onPeriod = (p: DayRange) => onSearch({ ...search, from: p.from, to: p.to });
  return (
    <>
      <PageHead>
        <Cartouche>{t.admin.dashboardTitle}</Cartouche>
        <QuickActions />
      </PageHead>
      <div className="grid grid-cols-1 gap-8">
        {failed && <FormAlert>{t.dashboard.loadFailed}</FormAlert>}
        <TodayKpis
          today={todayCounts(dayQ.data, now, win)}
          needsConfirmation={weekQ.data?.needs_confirmation}
          unpaid={weekQ.data?.unpaid_subscriptions}
        />
        <MoneyKpis />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <TodayLessons lessons={dayQ.data} className="md:col-span-2 xl:col-span-1 xl:row-span-2" />
          <section aria-label={t.dashboard.home.work} className={`grid grid-cols-1 content-start gap-4 ${card}`}>
            <KpiStrip summary={weekQ.data} work={tab} />
            <WorkPanel tab={tab} work={workQ.data} />
          </section>
          <RecentInbox />
        </div>
        <WeekSection week={week} data={weekQ.data} />
        <PeriodSection period={period} onPeriod={onPeriod} data={periodQ.data} stale={periodQ.isPlaceholderData} />
        <ExportsPanel period={period} month={previousMonth(today)} />
      </div>
    </>
  );
}
