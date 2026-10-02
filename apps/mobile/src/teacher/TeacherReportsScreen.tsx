import { RIYADH_TZ } from '@ab/shared';
import { useState, type ReactElement } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { usePendingReports, useTeacherMe } from './queries';
import { PendingReportRow, StudentHistoryRow, SubmittedReportRow } from './ReportRows';
import type { TeacherReportView } from './types';

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
  const rows: Record<View, Rows> = {
    pending: {
      data: (pending.data ?? []).map((r) => ({ key: `${r.lesson_id}:${r.student.id}`, row: <PendingReportRow row={r} tz={tz} /> })),
      loaded: pending.data !== undefined,
      failed: pending.isError,
      empty: t.reports.noPending,
      refresh: () => void pending.refetch(),
    },
    submitted: {
      data: sent.items.map((r) => ({ key: r.id, row: <SubmittedReportRow row={r} tz={tz} /> })),
      loaded: sent.data !== undefined,
      failed: sent.isError,
      empty: t.reports.noSubmitted,
      refresh: sent.refresh,
      more: sent.loadMore,
    },
    students: {
      data: (me.data?.students ?? []).map((s) => ({ key: s.id, row: <StudentHistoryRow student={s} /> })),
      loaded: me.data !== undefined,
      failed: me.isError,
      empty: t.teacherDash.noStudents,
      refresh: () => void me.refetch(),
    },
  };
  const shown = rows[view];
  return (
    <Screen>
      <ScreenHeader title={t.teacherNav.reports} />
      <FilterPills items={views()} value={view} onChange={setView} accessibilityLabel={t.teacherNav.reports} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={shown.data}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.row}
        onEndReached={shown.more}
        refreshing={false}
        onRefresh={shown.refresh}
        ListEmptyComponent={
          shown.loaded ? <EmptyState title={shown.empty} /> : shown.failed ? <ErrorState onRetry={shown.refresh} /> : null
        }
      />
    </Screen>
  );
}
