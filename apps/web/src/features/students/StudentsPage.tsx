import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { studentListQuery } from './api';
import { CreateStudentDialog } from './CreateStudentDialog';
import { activeFilterCount, type StudentsFilters } from './filters';
import { StudentFilterBar } from './StudentFilterBar';
import { studentColumns } from './studentColumns';
import { StudentSearch } from './StudentSearch';

export type StudentsSearch = { search: string; page: number; filters?: StudentsFilters };

type StudentsPageProps = StudentsSearch & {
  /** Writes search/page/filters to the URL (server-side paging, R-NFR-08). */
  onChange: (next: StudentsSearch) => void;
  onOpen: (studentId: string) => void;
};

/**
 * Students list: search by name / phone / code, filter, paginate, add (R-STU-01..03). Inside the
 * shell's Page. Any search or filter change goes back to page 1.
 */
export function StudentsPage({ search, page, filters = {}, onChange, onOpen }: StudentsPageProps) {
  const { data, isError } = useQuery(studentListQuery(search, page, filters));
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dismiss = useCallback(() => setNotice(null), []);
  const columns = useMemo(() => studentColumns(onOpen), [onOpen]);
  const none = data?.total === 0 && !search && activeFilterCount(filters) === 0;

  return (
    <>
      <PageHead>
        <Cartouche>{t.students.title}</Cartouche>
        {data && (
          // ponytail: «{n} طالب» for every n; Arabic plural forms (3–10 طلاب) when copy needs them.
          <span className="text-sm text-ink-3 tabular-nums">{t.students.count.replace('{n}', String(data.total))}</span>
        )}
        <div className="ms-auto flex gap-2.5 max-sm:w-full max-sm:[&>*]:flex-1">
          {/* TODO(R-RPT-03): «تصدير» (students CSV) once the API has an export endpoint. */}
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {t.students.add}
          </Button>
        </div>
      </PageHead>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <StudentSearch initial={search} onSearch={(term) => onChange({ search: term, page: 1, filters })} />
        <StudentFilterBar value={filters} onChange={(next) => onChange({ search, page: 1, filters: next })} />
      </div>
      {isError && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {t.common.error}
        </p>
      )}
      {none ? (
        // The head already holds «إضافة طالب»: one primary per screen, so no second one here.
        <EmptyState title={t.students.empty}>{t.students.emptyHint}</EmptyState>
      ) : (
        <DataTable
          stacked
          columns={columns}
          data={data?.items ?? []}
          getRowId={(r) => r.id}
          onRowClick={(r) => onOpen(r.id)}
          emptyText={data ? t.common.notFound : t.common.loading}
        />
      )}
      {data && (
        <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={(p) => onChange({ search, page: p, filters })} />
      )}
      {adding && (
        <CreateStudentDialog
          onClose={() => setAdding(false)}
          onDone={(message) => {
            setAdding(false);
            setNotice(message);
          }}
        />
      )}
      {/* Keyed so «تم الدمج» right after «الطالب اتسجل» gets its own full 10 s (journey 6). */}
      {notice && <Toast key={notice} message={notice} duration={10_000} onDismiss={dismiss} />}
    </>
  );
}
