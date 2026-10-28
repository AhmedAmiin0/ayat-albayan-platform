import { useState } from 'react';

import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { StudentFilterBar } from '../list/StudentFilterBar';
import { activeCount, listParams, NO_FILTERS, type StudentFilters } from '../list/student-filters';
import { StudentRow } from '../list/StudentRow';
import type { StudentListItem } from '../shared/types';

const keyOf = (s: StudentListItem) => s.id;
const renderRow = ({ item }: { item: StudentListItem }) => <StudentRow student={item} />;

/**
 * «الطلاب» tab (R-MOB-02): GET /students, searched server-side by name, phone in any format or code.
 * Filters like the web (status with GET /students/status-counts, teacher, program, package, weekly,
 * tz) and a server-side sort go to the same endpoint as query params. The list screens' one compact top
 * (owner 2026-10-28): «الطلاب · 233» on the title's line, the pill search, one filter row, 8pt apart.
 */
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
