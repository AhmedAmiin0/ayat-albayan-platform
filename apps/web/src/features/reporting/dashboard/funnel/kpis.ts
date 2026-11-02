import type { DashboardSummary } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { WorkTab } from '@/features/reporting/dashboard/search';

// docs/07 §6 KPI strip: four numbers, each a filter link to the work behind it. Saffron («دورك»)
// only when there is work: a count above zero. «يحتاج تأكيد» only while the academy requires a
// confirmation (settings.lesson_confirmation_required, owner 2026-11-02): never a 0 tile.

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
