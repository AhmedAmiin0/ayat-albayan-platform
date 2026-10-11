import type { SalesStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { AllStudentRow } from './AllStudentRow';

/**
 * «كل الطلاب» of the salesperson (web /sales/all-students): every student of the academy, paged and
 * searched on the server (name or code), read-only. Scrolling to the end loads the next page.
 */
export function AllStudentsScreen() {
  const { color } = useTheme();
  const [search, setSearch] = useState('');
  const list = usePagedList<SalesStudentView>({ path: '/sales/students/all', params: { search } });
  return (
    <Screen>
      <ScreenHeader
        title={t.sales.allStudents.title}
        subtitle={list.data ? t.students.count.replace('{n}', String(list.total)) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <SearchField onSearch={setSearch} label={t.sales.allStudents.search} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <AllStudentRow student={item} />}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={t.sales.allStudents.empty} />
          ) : list.isError ? (
            <ErrorState message={t.sales.loadFailed} onRetry={list.refresh} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
