import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Pager } from '@/components/ui/layout/pager';
import { SearchInput } from '@/components/ui/form/search-input';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n';
import { ALL_STUDENTS_PAGE_SIZE, salesAllStudentsQuery } from './academy-api';
import { allStudentColumns } from './all-student-columns';

/**
 * «كل الطلاب» on /sales/students (the default view; «طلابي» is the other): every student of the academy,
 * paged and searched on the server (name or code). Read-only: no money, notes or links.
 */
export function AllStudents() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const list = useQuery(salesAllStudentsQuery({ page, search: search.trim() }));
  return (
    <>
      <div className="mb-3 max-w-sm">
        <SearchInput
          aria-label={t.sales.allStudents.search}
          placeholder={t.sales.allStudents.search}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {list.isPending && <ListSkeleton />}
      {list.isError && (
        <FormAlert>
          {t.sales.loadFailed}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void list.refetch()}>
            {t.sales.retry}
          </Button>
        </FormAlert>
      )}
      {list.data && (
        <>
          <DataTable
            stacked
            label={t.sales.allStudents.title}
            columns={allStudentColumns}
            data={list.data.items}
            getRowId={(s) => s.id}
            emptyText={t.sales.allStudents.empty}
          />
          <Pager page={page} total={list.data.total} pageSize={ALL_STUDENTS_PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </>
  );
}
