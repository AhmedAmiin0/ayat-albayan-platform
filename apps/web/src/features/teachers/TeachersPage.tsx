import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { t } from '@/lib/i18n';
import { teachersPageQuery, type Page, type Teacher } from './api';
import { FormAlert } from '@/components/ui/form-alert';
import { teacherColumns } from './teacher-columns';
import { TeacherDialog } from './TeacherDialog';

type Props = { page: number; onPage: (page: number) => void; onOpen: (teacherId: string) => void };

type TableProps = Pick<Props, 'onPage' | 'onOpen'> & {
  data: Page<Teacher>;
  columns: ReturnType<typeof teacherColumns>;
};

function TeachersTable({ data, columns, onOpen, onPage }: TableProps) {
  if (data.total === 0) return <EmptyState title={t.teachers.empty} />;
  return (
    <>
      <DataTable stacked columns={columns} data={data.items} getRowId={(row) => row.id} onRowClick={(row) => onOpen(row.id)} />
      <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={onPage} />
    </>
  );
}

/** Admin teacher list with create/edit dialog (R-TCH-01). The shell renders the jadwal page. */
export function TeachersPage({ page, onPage, onOpen }: Props) {
  const list = useQuery(teachersPageQuery(page));
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
      {list.isPending && <p className="py-6 text-center text-ink-3">{t.common.loading}</p>}
      {list.data && <TeachersTable data={list.data} columns={columns} onOpen={onOpen} onPage={onPage} />}
      {editing && (
        <TeacherDialog teacher={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
