import { RIYADH_TZ, type TeacherStudentKind, type TeacherStudentView } from '@ab/shared';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useTeacherMe } from '../lib/queries';
import { StudentRow } from '../components/StudentRow';
import { useMyStudents } from '../lib/students-queries';

const kinds = (): FilterPill<TeacherStudentKind>[] => [
  { value: 'subscribed', label: t.teacherStudents.subscribed },
  { value: 'trial', label: t.teacherStudents.trial },
];

const keyOf = (s: TeacherStudentView) => s.id;

/**
 * «الطلاب» (R-TCH-03): my students in two separate lists, «مشتركين» and «تجريبي», one at a time —
 * never mixed. No phone, guardian or money. Pull to refresh; offline the saved list stays. The list
 * screens' compact top (owner 2026-10-28): the shown list's total on the title's line, the pills 8pt
 * under it, the rows in one inset card inside the gutter.
 */
export function TeacherStudentsScreen() {
  const [kind, setKind] = useState<TeacherStudentKind>('subscribed');
  const list = useMyStudents(kind);
  const tz = useTeacherMe().data?.tz ?? RIYADH_TZ;
  const inset = useTabBarInset();
  const renderRow = useCallback(({ item }: ListRenderItemInfo<TeacherStudentView>) => <StudentRow student={item} tz={tz} />, [tz]);
  const rows = useInsetRows(renderRow, list.data?.length ?? 0);
  return (
    <Screen list>
      <ScreenHeader title={t.teacherStudents.title} size="h2" connecting count={list.data?.length} />
      <FilterPills items={kinds()} value={kind} onChange={setKind} accessibilityLabel={t.teacherStudents.kinds} />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={list.data ?? []}
        keyExtractor={keyOf}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={kind === 'trial' ? t.teacherStudents.emptyTrial : t.teacherStudents.emptySubscribed} />
          ) : list.isError ? (
            <ErrorState message={t.teacherStudents.loadFailed} onRetry={() => void list.refetch()} />
          ) : (
            <Note>{t.common.loading}</Note>
          )
        }
        {...rows}
      />
    </Screen>
  );
}
