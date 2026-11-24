import { View } from 'react-native';
import { t, EmptyState, InsetGroup } from '@ab/mobile-kit';
import type { DashboardWork, WorkList, WorkTab } from '@ab/money';
import { Note } from '@/core/ui/feedback/Note';
import { PendingRow, TaskListRow, UnpaidListRow } from './WorkRows';

const EMPTY: Record<WorkTab, string> = {
  reports: t.dashboard.noPendingReports,
  unpaid: t.dashboard.noUnpaid,
  tasks: t.dashboard.noTasks,
};

const listOf = (w: DashboardWork, tab: WorkTab): WorkList<unknown> =>
  tab === 'reports' ? w.pending_reports : tab === 'unpaid' ? w.unpaid : w.tasks;

/** Oldest first; a truncation line shows the remainder. */
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
