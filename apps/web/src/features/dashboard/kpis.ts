import type { DashboardSummary } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { WorkTab } from './search';

// docs/07 §6 KPI strip: four numbers, each a filter link to the work behind it. Saffron («دورك»)
// only when there is work: a count above zero.

export type KpiKey = 'needsConfirm' | WorkTab;

export interface Kpi {
  key: KpiKey;
  value: number;
  label: string;
  /** Work waiting → saffron numeral. */
  act: boolean;
}

type Counts = Pick<DashboardSummary, 'needs_confirmation' | 'pending_reports' | 'unpaid_subscriptions' | 'open_tasks'>;

export function kpisOf(s: Counts): Kpi[] {
  const rows: Omit<Kpi, 'act'>[] = [
    { key: 'needsConfirm', value: s.needs_confirmation, label: t.enums.lessonStatus.scheduled },
    { key: 'reports', value: s.pending_reports, label: t.dashboard.pendingReports },
    { key: 'unpaid', value: s.unpaid_subscriptions, label: t.dashboard.unpaidSubscriptions },
    { key: 'tasks', value: s.open_tasks, label: t.dashboard.tasks },
  ];
  return rows.map((k) => ({ ...k, act: k.value > 0 }));
}
