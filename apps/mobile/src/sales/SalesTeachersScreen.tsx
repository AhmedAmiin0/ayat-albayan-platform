import { filterSalesTeachers, NO_TEACHER_FILTER, PROGRAMS, teacherPrograms } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useSalesTeachers } from './sales-api';
import { SalesTeacherRow } from './SalesTeacherRow';
import { TeacherFiltersBar } from './TeacherFiltersBar';

/**
 * «المعلمون» of the salesperson (web /sales/teachers, master-detail): every active teacher with counts
 * and «في حلقة الآن», searchable and filtered by program and gender; a row opens the teacher's students.
 */
export function SalesTeachersScreen() {
  const { color } = useTheme();
  const list = useSalesTeachers();
  const [filter, setFilter] = useState(NO_TEACHER_FILTER);
  const all = list.data ?? [];
  const shown = filterSalesTeachers(all, filter);
  const empty = all.length === 0 ? <EmptyState title={t.sales.teachers.empty} /> : <EmptyState title={t.sales.teachers.noMatch} />;
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.teachers.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      {all.length > 0 ? <TeacherFiltersBar value={filter} programs={teacherPrograms(all, PROGRAMS)} onChange={setFilter} /> : null}
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        accessibilityLabel={t.sales.teachers.listLabel}
        data={shown}
        keyExtractor={(tc) => tc.id}
        renderItem={({ item }) => <SalesTeacherRow teacher={item} />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.data ? (
            empty
          ) : list.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={() => void list.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
