import { boardStudents, type TeacherStudentKind, type TeacherStudentView } from '@ab/shared';
import { useViewerTz } from '@/core/lib/clock';
import {
  usePullRefresh,
  t,
  EmptyState,
  ErrorState,
  FilterPills,
  type FilterPill,
  Screen,
  ScreenHeader,
  useTabBarInset,
} from '@ab/mobile-kit';
import { useCallback, useState } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { Note } from '@/core/ui/feedback/Note';
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

function StudentsEmpty({ kind, loaded, failed, retry }: StudentsEmptyProps) {
  const s = t.teacherStudents;
  if (loaded) return <EmptyState title={kind === 'trial' ? s.emptyTrial : s.emptySubscribed} />;
  return failed ? <ErrorState message={s.loadFailed} onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

/** Subscribed and trial never mixed (R-TCH-03); no phone, guardian or money. */
export function TeacherStudentsScreen() {
  const [kind, setKind] = useState<TeacherStudentKind>('subscribed');
  const list = useMyStudents(kind);
  // The API splits by kind; only current students show (docs/46 D4: never paused or churned).
  const shown = list.data ? boardStudents(list.data, 'all') : undefined;
  const retry = () => void list.refetch();
  // docs/48: the spinner only for her own pull, never a push refetch (no students poll).
  const pull = usePullRefresh(list.refetch);
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
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        ListEmptyComponent={
          <StudentsEmpty kind={kind} loaded={!!list.data} failed={list.isError} retry={retry} />
        }
        {...rows}
      />
    </Screen>
  );
}
