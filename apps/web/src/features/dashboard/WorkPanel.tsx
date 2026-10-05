import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { sectionTitle } from './Bar';
import { PendingReportsList } from './PendingReportsList';
import type { WorkTab } from './search';
import { TasksList } from './TasksList';
import type { DashboardWork, WorkList } from './types';
import { UnpaidList } from './UnpaidList';

const TABS: Record<WorkTab, { title: string; list: (w: DashboardWork) => WorkList<unknown>; view: (w: DashboardWork) => ReactNode }> = {
  reports: {
    title: t.dashboard.pendingReports,
    list: (w) => w.pending_reports,
    view: (w) => <PendingReportsList items={w.pending_reports.items} />,
  },
  unpaid: { title: t.dashboard.unpaidSubscriptions, list: (w) => w.unpaid, view: (w) => <UnpaidList items={w.unpaid.items} /> },
  tasks: { title: t.dashboard.tasks, list: (w) => w.tasks, view: (w) => <TasksList items={w.tasks.items} /> },
};

/** The queue the KPI strip filters to: one list at a time, the oldest WORK_ITEMS first. */
export function WorkPanel({ tab, work }: { tab: WorkTab; work: DashboardWork | undefined }) {
  const { title, list, view } = TABS[tab];
  const more = work ? list(work).total - list(work).items.length : 0;
  return (
    <section aria-labelledby="dash-work" aria-live="polite" className="grid grid-cols-1 gap-1">
      <h2 id="dash-work" className={sectionTitle}>
        {title}
      </h2>
      {work ? view(work) : <p className="py-3 text-sm text-ink-3">{t.common.loading}</p>}
      {more > 0 && <p className="text-xs text-ink-3">{t.dashboard.more.replace('{n}', String(more))}</p>}
    </section>
  );
}
