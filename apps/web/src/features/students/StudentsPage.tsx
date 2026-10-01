import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { studentListQuery } from './api';
import { CreateStudentDialog } from './CreateStudentDialog';
import { studentColumns } from './studentColumns';

export type StudentsSearch = { search: string; page: number };

type StudentsPageProps = StudentsSearch & {
  /** Writes search/page to the URL (server-side paging, R-NFR-08). */
  onChange: (next: StudentsSearch) => void;
  onOpen: (studentId: string) => void;
};

/** Students list: search by name / phone / code, paginate, add (R-STU-01..03). */
export function StudentsPage({ search, page, onChange, onOpen }: StudentsPageProps) {
  const { data, isError } = useQuery(studentListQuery(search, page));
  const [term, setTerm] = useState(search);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t.students.title}</h2>
        <Button onClick={() => setAdding(true)}>{t.students.add}</Button>
      </div>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ search: term.trim(), page: 1 });
        }}
      >
        <Input
          aria-label={t.common.search}
          placeholder={t.students.searchPlaceholder}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Button type="submit" variant="outline">{t.common.search}</Button>
      </form>
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      {isError && <p role="alert" className="text-sm text-destructive">{t.common.error}</p>}
      <DataTable
        columns={studentColumns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        onRowClick={(r) => onOpen(r.id)}
        emptyText={data ? t.students.empty : t.common.loading}
      />
      <nav className="flex items-center justify-center gap-3 text-sm">
        <Button variant="outline" size="sm" disabled={page <= 1}
          onClick={() => onChange({ search, page: page - 1 })}>{t.students.prevPage}</Button>
        <span>{t.students.pageOf.replace('{page}', String(page)).replace('{pages}', String(pages))}</span>
        <Button variant="outline" size="sm" disabled={page >= pages}
          onClick={() => onChange({ search, page: page + 1 })}>{t.students.nextPage}</Button>
      </nav>
      {adding && (
        <CreateStudentDialog
          onClose={() => setAdding(false)}
          onDone={(message) => {
            setAdding(false);
            setNotice(message);
          }}
        />
      )}
    </section>
  );
}
