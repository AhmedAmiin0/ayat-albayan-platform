import { RIYADH_TZ, type TeacherReportView } from '@ab/shared';
import { useState, type ReactElement } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { usePendingReports, useTeacherMe } from '../lib/queries';
import { PendingReportRow, StudentHistoryRow, SubmittedReportRow } from '../components/ReportRows';

type View = 'pending' | 'submitted' | 'students';

const views = (): FilterPill<View>[] => [
  { value: 'pending', label: t.reports.pending },
  { value: 'submitted', label: t.reports.submittedTitle },
  { value: 'students', label: t.teacherDash.myStudents },
];

interface Rows {
  data: readonly { key: string; row: ReactElement }[];
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
 * lists stay.
 */
export function TeacherReportsScreen() {
  const [view, setView] = useState<View>('pending');
  const me = useTeacherMe();
  const tz = me.data?.tz ?? RIYADH_TZ;
  const pending = usePendingReports();
  const sent = usePagedList<TeacherReportView>({ path: '/teachers/me/reports' });
  const inset = useTabBarInset();
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
      <ScreenHeader title={t.teacherNav.reports} />
      <FilterPills items={views()} value={view} onChange={setView} accessibilityLabel={t.teacherNav.reports} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={shown.data}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.row}
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
