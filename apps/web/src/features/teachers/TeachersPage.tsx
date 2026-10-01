import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { teachersPageQuery, type Teacher } from './api';
import { Pager } from './Pager';
import { teacherColumns } from './teacher-columns';
import { TeacherDialog } from './TeacherDialog';

/** Admin teacher list with create/edit dialog (R-TCH-01). */
export function TeachersPage({ page }: { page: number }) {
  const navigate = useNavigate();
  const list = useQuery(teachersPageQuery(page));
  const [editing, setEditing] = useState<Teacher | 'new' | null>(null);
  const columns = useMemo(() => teacherColumns(setEditing), []);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.teachers.title}</h2>
        <Button onClick={() => setEditing('new')}>{t.teachers.add}</Button>
      </div>
      {list.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t.common.error}
        </p>
      )}
      {list.isPending ? (
        <p className="text-muted-foreground">{t.common.loading}</p>
      ) : (
        <DataTable
          columns={columns}
          data={list.data?.items ?? []}
          getRowId={(row) => row.id}
          emptyText={t.teachers.empty}
          onRowClick={(row) =>
            void navigate({ to: '/admin/teachers/$teacherId', params: { teacherId: row.id } })
          }
        />
      )}
      {list.data && (
        <Pager
          page={list.data.page}
          total={list.data.total}
          pageSize={list.data.pageSize}
          onPage={(p) => void navigate({ to: '/admin/teachers', search: { page: p } })}
        />
      )}
      {editing && (
        <TeacherDialog teacher={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
