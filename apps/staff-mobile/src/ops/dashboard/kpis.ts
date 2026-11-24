import { t } from '@ab/mobile-kit';
import type { DashboardCounts, WorkTab } from '@ab/money';

export interface Kpi {
  key: 'activeStudents' | 'needsConfirm' | WorkTab;
  value: number;
  label: string;
  /** Work waiting → saffron numeral (a count above zero, as the web strip). */
  act: boolean;
  /** The work list this tile jumps to; none for the plain counts. */
  tab?: WorkTab;
}

/** «يحتاج تأكيد» exists only while the academy requires a confirmation (no 0 tile otherwise). */
const confirmTile = (s: DashboardCounts, required: boolean): Omit<Kpi, 'act'>[] =>
  required ? [{ key: 'needsConfirm', value: s.needs_confirmation, label: t.enums.lessonStatus.scheduled }] : [];

/**
 * The web's KPI strip (reports, unpaid, tasks, «يحتاج تأكيد» when `required`, settings
 * .lesson_confirmation_required) plus the active students.
 */
export function kpisOf(s: DashboardCounts, required: boolean): Kpi[] {
  const rows: Omit<Kpi, 'act'>[] = [
    ...confirmTile(s, required),
    { key: 'reports', value: s.pending_reports, label: t.dashboard.pendingReports, tab: 'reports' },
    {
      key: 'unpaid',
      value: s.unpaid_subscriptions,
      label: t.dashboard.unpaidSubscriptions,
      tab: 'unpaid',
    },
    { key: 'tasks', value: s.open_tasks, label: t.dashboard.tasks, tab: 'tasks' },
  ];
  const active: Kpi = {
    key: 'activeStudents',
    value: s.active_students,
    label: t.mobileAdmin.dashboard.activeStudents,
    act: false,
  };
  return [...rows.map((k) => ({ ...k, act: k.value > 0 })), active];
}
