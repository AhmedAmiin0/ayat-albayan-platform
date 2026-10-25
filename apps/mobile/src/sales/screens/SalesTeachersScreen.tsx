import { filterSalesTeachers, NO_TEACHER_FILTER, PROGRAMS, teacherPrograms } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useSalesTeachers } from '../lib/sales-api';
import { SalesTeacherRow } from '../components/SalesTeacherRow';
import { TeacherFiltersBar } from '../components/TeacherFiltersBar';

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
