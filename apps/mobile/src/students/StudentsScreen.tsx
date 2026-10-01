import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { StudentRow } from './StudentRow';
import type { StudentListItem } from './types';

/**
 * «الطلاب» tab (R-MOB-02): GET /students, searched server-side by name, phone in any format or code.
 * TODO(R-MOB-02): status FilterPills (with API counts) once GET /students takes ?status=
 * (the web carries the same gap as TODO(R-STU-01)); filtering loaded pages here would lie.
 */
export function StudentsScreen() {
  const [search, setSearch] = useState('');
  const list = usePagedList<StudentListItem>({ path: '/students', params: { search } });
  const empty = search ? t.common.notFound : t.students.empty;
  return (
    <Screen>
      <ScreenHeader
        title={t.nav.students}
        subtitle={list.data ? t.students.count.replace('{n}', String(list.total)) : undefined}
      />
      <SearchField onSearch={setSearch} label={t.students.searchPlaceholder} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StudentRow student={item} />}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={empty} />
          ) : list.isError ? (
            <ErrorState onRetry={() => void list.refetch()} />
          ) : null
        }
      />
    </Screen>
  );
}
