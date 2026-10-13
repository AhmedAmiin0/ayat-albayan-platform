import { useState } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { usePagedList } from '@/lib/use-paged-list';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SearchField } from '@/ui/SearchField';
import { StudentFilterBar } from './StudentFilterBar';
import { activeCount, listParams, NO_FILTERS, type StudentFilters } from './student-filters';
import { StudentRow } from './StudentRow';
import type { StudentListItem } from './types';

/**
 * «الطلاب» tab (R-MOB-02): GET /students, searched server-side by name, phone in any format or code.
 * Filters like the web (status with GET /students/status-counts, teacher, program, package, weekly,
 * tz) and a server-side sort go to the same endpoint as query params.
 */
export function StudentsScreen() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StudentFilters>(NO_FILTERS);
  const list = usePagedList<StudentListItem>({ path: '/students', params: { search, ...listParams(filters) } });
  const filtered = search !== '' || activeCount(filters) > 0;
  const empty = filtered ? t.common.notFound : t.students.empty;
  return (
    <Screen>
      <ScreenHeader
        title={t.nav.students}
        subtitle={list.data ? t.students.count.replace('{n}', String(list.total)) : undefined}
      />
      <SearchField onSearch={setSearch} label={t.students.searchPlaceholder} />
      <StudentFilterBar value={filters} onChange={setFilters} searching={search !== ''} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StudentRow student={item} />}
        onEndReached={list.loadMore}
        refreshing={list.isRefetching}
        onRefresh={list.refresh}
        ListEmptyComponent={
          list.data ? (
            <EmptyState title={empty} />
          ) : list.isError ? (
            <ErrorState onRetry={list.refresh} />
          ) : null
        }
      />
    </Screen>
  );
}
