import type { DashboardSummary, WorkTab } from '@ab/money';
import { t } from '@ab/web-kit';

// KPI strip (docs/07 §6): highlighted only above zero; confirmation tile only when it is required.

export type KpiKey = 'needsConfirm' | WorkTab;

export interface Kpi {
  key: KpiKey;
  value: number;
  label: string;
  /** Work waiting → saffron numeral. */
  act: boolean;
}

type Counts = Pick<DashboardSummary, 'needs_confirmation' | 'pending_reports' | 'unpaid_subscriptions' | 'open_tasks'>;

export function kpisOf(s: Counts, required: boolean): Kpi[] {
  const rows: Omit<Kpi, 'act'>[] = [
    { key: 'needsConfirm', value: s.needs_confirmation, label: t.enums.lessonStatus.scheduled },
    { key: 'reports', value: s.pending_reports, label: t.dashboard.pendingReports },
    { key: 'unpaid', value: s.unpaid_subscriptions, label: t.dashboard.unpaidSubscriptions },
    { key: 'tasks', value: s.open_tasks, label: t.dashboard.tasks },
  ];
  const shown = (k: Omit<Kpi, 'act'>): boolean => required || k.key !== 'needsConfirm';
  return rows.filter(shown).map((k) => ({ ...k, act: k.value > 0 }));
}
