import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { InsetGroup } from '@/core/ui/surface/inset';
import type { DashboardWork, WorkList, WorkTab } from './dashboard-types';
import { Note } from '@/more/Note';
import { PendingRow, TaskListRow, UnpaidListRow } from './WorkRows';

const EMPTY: Record<WorkTab, string> = {
  reports: t.dashboard.noPendingReports,
  unpaid: t.dashboard.noUnpaid,
  tasks: t.dashboard.noTasks,
};

const listOf = (w: DashboardWork, tab: WorkTab): WorkList<unknown> =>
  tab === 'reports' ? w.pending_reports : tab === 'unpaid' ? w.unpaid : w.tasks;

/**
 * The queue behind the KPI tiles: one list at a time, oldest first, in one inset card (owner
 * 2026-10-28: one container rule), «و{n} أخرى» under it when truncated.
 */
export function WorkPanel({ tab, work }: { tab: WorkTab; work: DashboardWork }) {
  const list = listOf(work, tab);
  const more = list.total - list.items.length;
  return (
    <View style={{ gap: 8 }}>
      {list.items.length === 0 ? (
        <EmptyState title={EMPTY[tab]} />
      ) : (
        <InsetGroup>
          {tab === 'reports'
            ? work.pending_reports.items.map((r) => <PendingRow key={`${r.lesson_id}:${r.student.id}`} row={r} />)
            : tab === 'unpaid'
              ? work.unpaid.items.map((r) => <UnpaidListRow key={r.id} row={r} />)
              : work.tasks.items.map((r) => <TaskListRow key={r.id} row={r} />)}
        </InsetGroup>
      )}
      {more > 0 ? <Note>{t.dashboard.more.replace('{n}', String(more))}</Note> : null}
    </View>
  );
}
