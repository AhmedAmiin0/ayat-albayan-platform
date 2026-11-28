import {
  filterSalesTeachers,
  NO_TEACHER_FILTER,
  type SalesTeacherView,
  teacherPrograms,
} from '@ab/shared';
import { PROGRAMS } from '@ab/catalog';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  t,
  useTheme,
  LazyList,
} from '@ab/mobile-kit';
import { useSalesTeachers } from '@/sales/sales/lib/sales-api';
import { SalesTeacherRow } from '@/sales/sales/components/SalesTeacherRow';
import { TeacherFiltersBar } from '@/sales/sales/components/TeacherFiltersBar';

export function SalesTeachersScreen() {
  const { color } = useTheme();
  const list = useSalesTeachers();
  const [filter, setFilter] = useState(NO_TEACHER_FILTER);
  const all = list.data ?? [];
  const shown = filterSalesTeachers(all, filter);
  const row = useCallback(({ item }: { item: SalesTeacherView }) => <SalesTeacherRow teacher={item} />, []);
  const empty = all.length === 0 ? <EmptyState title={t.sales.teachers.empty} /> : <EmptyState title={t.sales.teachers.noMatch} />;
  return (
    <Screen list>
      <ScreenHeader
        title={t.sales.teachers.title}
        size="h2"
        connecting
        count={list.data ? shown.length : undefined}
        leading={<BackButton onPress={() => router.back()} />}
      />
      {all.length > 0 ? <TeacherFiltersBar value={filter} programs={teacherPrograms(all, PROGRAMS)} onChange={setFilter} /> : null}
      <LazyList
        accessibilityLabel={t.sales.teachers.listLabel}
        data={shown}
        keyExtractor={(tc) => tc.id}
        renderItem={row}
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
