import { useState } from 'react';
import type { StudentListItem } from '@ab/shared';

import { t, EmptyState, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { SearchField } from '@/core/ui/form/SearchField';
import { StudentFilterBar } from '@/students/list/StudentFilterBar';
import { activeCount, listParams, NO_FILTERS, type StudentFilters } from '@/students/list/student-filters';
import { StudentRow } from '@/students/list/StudentRow';

const keyOf = (s: StudentListItem) => s.id;
const renderRow = ({ item }: { item: StudentListItem }) => <StudentRow student={item} />;

/** Searched server-side by name, any phone format or code (R-MOB-02). */
export function StudentsScreen() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StudentFilters>(NO_FILTERS);
  const list = usePagedList<StudentListItem>({ path: '/students', params: { search, ...listParams(filters) } });
  const filtered = search !== '' || activeCount(filters) > 0;
  const empty = filtered ? t.common.notFound : t.students.empty;
  return (
    <Screen list>
      <ScreenHeader title={t.nav.students} size="h2" connecting count={list.data ? list.total : undefined} />
      <SearchField compact onSearch={setSearch} label={t.students.searchPlaceholder} />
      <StudentFilterBar value={filters} onChange={setFilters} searching={search !== ''} />
      <LazyList
        paged={list}
        keyExtractor={keyOf}
        renderItem={renderRow}
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
