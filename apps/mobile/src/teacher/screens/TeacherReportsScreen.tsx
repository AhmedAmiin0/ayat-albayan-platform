import { RIYADH_TZ, type TeacherReportView } from '@ab/shared';
import { useState, type ReactElement } from 'react';

import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { usePendingReports, useTeacherMe } from '@/teacher/lib/queries';
import { PendingReportRow, StudentHistoryRow, SubmittedReportRow } from '@/teacher/components/ReportRows';

type View = 'pending' | 'submitted' | 'students';

const views = (): FilterPill<View>[] => [
  { value: 'pending', label: t.reports.pending },
  { value: 'submitted', label: t.reports.submittedTitle },
  { value: 'students', label: t.teacherDash.myStudents },
];

interface Row {
  key: string;
  row: ReactElement;
}

// The rows are memo: a re-render hands them the same report and tz, so none redraws.
const keyOf = (item: Row) => item.key;
const renderRow = ({ item }: { item: Row }) => item.row;

interface Rows {
  data: readonly Row[];
  loaded: boolean;
  failed: boolean;
  empty: string;
  refreshing: boolean;
  refresh: () => void;
  more?: () => void;
}

/**
 * «التقارير» (R-TCH-03, R-REP-05): the reports still to write, the ones I sent (edit while the
 * window is open, else read), and each of my students' history. Pull to refresh; offline the saved
 * lists stay. The list screens' compact top (owner 2026-10-28): h2 title, the pills 8pt under it, the rows
 * in one inset card.
 */
export function TeacherReportsScreen() {
  const [view, setView] = useState<View>('pending');
  const me = useTeacherMe();
  const tz = me.data?.tz ?? RIYADH_TZ;
  const pending = usePendingReports();
  const sent = usePagedList<TeacherReportView>({ path: '/teachers/me/reports' });
  const rows: Record<View, Rows> = {
    pending: {
      data: (pending.data ?? []).map((r) => ({ key: `${r.lesson_id}:${r.student.id}`, row: <PendingReportRow row={r} tz={tz} /> })),
      loaded: pending.data !== undefined,
      failed: pending.isError,
      empty: t.reports.noPending,
      refreshing: pending.isRefetching,
      refresh: () => void pending.refetch(),
    },
    submitted: {
      data: sent.items.map((r) => ({ key: r.id, row: <SubmittedReportRow row={r} tz={tz} /> })),
      loaded: sent.data !== undefined,
      failed: sent.isError,
      empty: t.reports.noSubmitted,
      refreshing: sent.isRefetching && !sent.isFetchingNextPage,
      refresh: sent.refresh,
      more: sent.loadMore,
    },
    students: {
      data: (me.data?.students ?? []).map((s) => ({ key: s.id, row: <StudentHistoryRow student={s} /> })),
      loaded: me.data !== undefined,
      failed: me.isError,
      empty: t.teacherDash.noStudents,
      refreshing: me.isRefetching,
      refresh: () => void me.refetch(),
    },
  };
  const shown = rows[view];
  return (
    <Screen list>
      <ScreenHeader title={t.teacherNav.reports} size="h2" connecting />
      <FilterPills items={views()} value={view} onChange={setView} accessibilityLabel={t.teacherNav.reports} />
      <LazyList
        data={shown.data}
        keyExtractor={keyOf}
        renderItem={renderRow}
        onEndReached={shown.more}
        refreshing={shown.refreshing}
        onRefresh={shown.refresh}
        ListEmptyComponent={
          shown.loaded ? (
            <EmptyState title={shown.empty} />
          ) : shown.failed ? (
            <ErrorState onRetry={shown.refresh} />
          ) : (
            <Note>{t.common.loading}</Note>
          )
        }
      />
    </Screen>
  );
}
