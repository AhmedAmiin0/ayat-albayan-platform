import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { t } from '@/lib/i18n/i18n';
import { withFilter, withoutFilters, withSort, type ListUrlState } from '@/lib/list/list-url';
import { teachersPageQuery, type Page, type Teacher, type TeacherListRow } from './api';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { teacherColumns } from './teacher-columns';
import { TeacherDialog } from './TeacherDialog';

type Props = {
  /** Page, column sort and filters, kept in the route search (R-NFR-08). */
  list: ListUrlState;
  onList: (next: ListUrlState) => void;
  onOpen: (teacherId: string) => void;
};

type TableProps = Props & { data: Page<TeacherListRow>; columns: ReturnType<typeof teacherColumns> };

function TeachersTable({ data, columns, list, onList, onOpen }: TableProps) {
  // No teacher at all (no filter): the empty state; a filter with no match keeps its controls.
  if (data.total === 0 && Object.keys(list.filters).length === 0) return <EmptyState title={t.teachers.empty} />;
  return (
    <>
      <DataTable
        fill
        stacked
        columns={columns}
        data={data.items}
        getRowId={(row) => row.id}
        onRowClick={(row) => onOpen(row.id)}
        emptyText={t.common.notFound}
        sort={{ key: list.sort.sort, dir: list.sort.dir, onChange: (next) => onList(withSort(list, next)) }}
        filters={{ values: list.filters, onChange: (key, value) => onList(withFilter(list, { key, value })), onClear: (keys) => onList(withoutFilters(list, keys)) }}
        toolbar={{ total: data.total }}
      />
      <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={(page) => onList({ ...list, page })} />
    </>
  );
}

/** Admin teacher list with create/edit dialog (R-TCH-01). The shell renders the jadwal page. */
export function TeachersPage({ list: state, onList, onOpen }: Props) {
  const list = useQuery(teachersPageQuery(state));
  const [editing, setEditing] = useState<Teacher | 'new' | null>(null);
  const columns = useMemo(() => teacherColumns({ onEdit: setEditing, onOpen }), [onOpen]);
  const total = list.data?.total;

  return (
    <>
      <PageHead>
        <Cartouche>{t.teachers.title}</Cartouche>
        {total !== undefined && (
          <span className="text-xs text-ink-3 tabular-nums">{t.teachers.count.replace('{n}', String(total))}</span>
        )}
        <div className="ms-auto flex gap-2.5">
          <Button onClick={() => setEditing('new')}>
            <Icon name="plus" />
            {t.teachers.add}
          </Button>
        </div>
      </PageHead>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.data && <TeachersTable data={list.data} columns={columns} list={state} onList={onList} onOpen={onOpen} />}
      {editing && (
        <TeacherDialog teacher={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
