import { RIYADH_TZ, type TeacherStudentKind } from '@ab/shared';
import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTeacherMe } from './queries';
import { StudentRow } from './StudentRow';
import { useMyStudents } from './students-queries';

const kinds = (): FilterPill<TeacherStudentKind>[] => [
  { value: 'subscribed', label: t.teacherStudents.subscribed },
  { value: 'trial', label: t.teacherStudents.trial },
];

/**
 * «الطلاب» (R-TCH-03): my students in two separate lists, «مشتركين» and «تجريبي», one at a time —
 * never mixed. No phone, guardian or money. Pull to refresh; offline the saved list stays.
 */
export function TeacherStudentsScreen() {
  const [kind, setKind] = useState<TeacherStudentKind>('subscribed');
  const list = useMyStudents(kind);
  const tz = useTeacherMe().data?.tz ?? RIYADH_TZ;
  return (
    <Screen>
      <ScreenHeader title={t.teacherStudents.title} />
      <FilterPills items={kinds()} value={kind} onChange={setKind} accessibilityLabel={t.teacherStudents.kinds} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.data ?? []}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StudentRow student={item} tz={tz} />}
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
      />
    </Screen>
  );
}
