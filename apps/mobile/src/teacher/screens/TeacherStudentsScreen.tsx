import { boardStudents, type TeacherStudentKind, type TeacherStudentView } from '@ab/shared';
import { useViewerTz } from '@/core/lib/clock';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { StudentRow } from '@/teacher/components/StudentRow';
import { useMyStudents } from '@/teacher/lib/students-queries';

const kinds = (): FilterPill<TeacherStudentKind>[] => [
  { value: 'subscribed', label: t.teacherStudents.subscribed },
  { value: 'trial', label: t.teacherStudents.trial },
];

const keyOf = (s: TeacherStudentView) => s.id;

interface StudentsEmptyProps {
  kind: TeacherStudentKind;
  loaded: boolean;
  failed: boolean;
  retry: () => void;
}

/** The empty list of this kind, the failed read with a retry, or «جاري التحميل». */
function StudentsEmpty({ kind, loaded, failed, retry }: StudentsEmptyProps) {
  const s = t.teacherStudents;
  if (loaded) return <EmptyState title={kind === 'trial' ? s.emptyTrial : s.emptySubscribed} />;
  return failed ? <ErrorState message={s.loadFailed} onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

/**
 * «الطلاب» (R-TCH-03): my students in two separate lists, «مشتركين» and «تجريبي», one at a time —
 * never mixed. No phone, guardian or money. Pull to refresh; offline the saved list stays. The list
 * screens' compact top (owner 2026-10-28): the shown list's total on the title's line, the pills 8pt
 * under it, the rows in one inset card inside the gutter.
 */
export function TeacherStudentsScreen() {
  const [kind, setKind] = useState<TeacherStudentKind>('subscribed');
  const list = useMyStudents(kind);
  // The API splits by kind; only current students show (docs/46 D4: never paused or churned).
  const shown = list.data ? boardStudents(list.data, 'all') : undefined;
  const retry = () => void list.refetch();
  const tz = useViewerTz();
  const inset = useTabBarInset();
  const renderRow = useCallback(({ item }: ListRenderItemInfo<TeacherStudentView>) => <StudentRow student={item} tz={tz} />, [tz]);
  const rows = useInsetRows(renderRow, shown?.length ?? 0);
  return (
    <Screen list>
      <ScreenHeader title={t.teacherStudents.title} size="h2" connecting count={shown?.length} />
      <FilterPills items={kinds()} value={kind} onChange={setKind} accessibilityLabel={t.teacherStudents.kinds} />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={shown ?? []}
        keyExtractor={keyOf}
        refreshing={list.isRefetching}
        onRefresh={retry}
        ListEmptyComponent={
          <StudentsEmpty kind={kind} loaded={!!list.data} failed={list.isError} retry={retry} />
        }
        {...rows}
      />
    </Screen>
  );
}
