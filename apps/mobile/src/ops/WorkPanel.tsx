import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/ui/EmptyState';
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

/** The queue behind the KPI tiles: one list at a time, oldest first, «و{n} أخرى» when truncated. */
export function WorkPanel({ tab, work }: { tab: WorkTab; work: DashboardWork }) {
  const list = listOf(work, tab);
  const more = list.total - list.items.length;
  return (
    <View style={{ marginHorizontal: -16 }}>
      {list.items.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <EmptyState title={EMPTY[tab]} />
        </View>
      ) : tab === 'reports' ? (
        work.pending_reports.items.map((r) => (
          <PendingRow key={`${r.lesson_id}:${r.student.id}`} row={r} />
        ))
      ) : tab === 'unpaid' ? (
        work.unpaid.items.map((r) => <UnpaidListRow key={r.id} row={r} />)
      ) : (
        work.tasks.items.map((r) => <TaskListRow key={r.id} row={r} />)
      )}
      {more > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Note>{t.dashboard.more.replace('{n}', String(more))}</Note>
        </View>
      ) : null}
    </View>
  );
}
