import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { Button, FormAlert, Pager, SearchInput, ListSkeleton, t } from '@ab/web-kit';
import { ALL_STUDENTS_PAGE_SIZE, salesAllStudentsQuery } from '@/features/sales/sales/academy-api';
import { usePermissions } from '@/features/people/auth';
import { allStudentColumns, peopleEditColumn } from '@/features/sales/sales/students/all-student-columns';

/** Paged and searched on the server; read-only: no money, notes or links. */
export function AllStudents() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const list = useQuery(salesAllStudentsQuery({ page, search: search.trim() }));
  const { can } = usePermissions();
  const columns = can('people.edit') ? [...allStudentColumns, peopleEditColumn] : allStudentColumns;
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
            columns={columns}
            data={list.data.items}
            getRowId={(s) => s.id}
            emptyText={t.sales.allStudents.empty}
          />
          <Pager
            page={page}
            total={list.data.total}
            pageSize={ALL_STUDENTS_PAGE_SIZE}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
