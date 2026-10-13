import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { studentListQuery, studentStatusCountsQuery } from './api';
import { BulkAssign } from '@/features/assistants/BulkAssign';
import { useStudentPick } from '@/features/assistants/use-student-pick';
import { CreateStudentDialog } from './CreateStudentDialog';
import { setFilter } from './filters';
import { isUnfiltered, studentTableControls, type StudentsSearch } from './search';
import { studentColumns } from './studentColumns';
import { StudentKindSwitch } from './StudentKindSwitch';
import { StudentSearch } from './StudentSearch';
import { useStudentFilters } from './use-student-filters';

export type { StudentsSearch } from './search';

const withoutKeys = (columns: Record<string, string> = {}, keys: string[]) =>
  Object.fromEntries(Object.entries(columns).filter(([k]) => !keys.includes(k)));

type StudentsPageProps = StudentsSearch & {
  /** Writes search/page/filters to the URL (server-side paging, R-NFR-08). */
  onChange: (next: StudentsSearch) => void;
  onOpen: (studentId: string) => void;
};

/**
 * Students list: search by name / phone / code, filter, sort by any column, paginate, add
 * (R-STU-01..03, R-NFR-08). Inside the shell's Page. Any search, filter or sort change goes back
 * to page 1. «الكل · مشترك · تجريبي» sits in the toolbar, on the status filter (owner 2026-10-12).
 */
export function StudentsPage({ search, page, filters = {}, sort, columns: colFilters, onChange, onOpen }: StudentsPageProps) {
  const { data, isError } = useQuery(studentListQuery(search, page, { filters, sort, columns: colFilters }));
  const counts = useQuery(studentStatusCountsQuery({ ...filters, status: undefined }));
  // The counts know the R-STU-01 filters only: under a search or a column filter they would not match the list.
  const narrowed = Boolean(search) || Object.values(colFilters ?? {}).some(Boolean);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dismiss = useCallback(() => setNotice(null), []);
  const pick = useStudentPick();
  const columns = useMemo(() => studentColumns(onOpen, pick.column), [onOpen, pick.column]);
  const view = { search, page: 1, filters, sort, columns: colFilters };
  const none = data?.total === 0 && isUnfiltered(view);
  const controls = studentTableControls(view, onChange);
  const kinds = (
    <StudentKindSwitch status={filters.status} counts={narrowed ? undefined : counts.data} onChange={(st) => onChange({ ...view, filters: setFilter(filters, 'status', st) })} />
  );
  const extra = useStudentFilters({
    value: filters,
    onChange: (next) => onChange({ ...view, filters: next }),
    onClearAll: (keys) => onChange({ ...view, filters: {}, columns: withoutKeys(colFilters, keys) }),
  });

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
          <BulkAssign pick={pick} onDone={setNotice} />
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {t.students.add}
          </Button>
        </div>
      </PageHead>
      {isError && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {t.common.error}
        </p>
      )}
      {none ? (
        // The head already holds «إضافة طالب»: one primary per screen, so no second one here.
        <TableBox center>
          <EmptyState title={t.students.empty}>{t.students.emptyHint}</EmptyState>
        </TableBox>
      ) : (
        <DataTable
          fill
          stacked
          columns={columns}
          data={data?.items ?? []}
          getRowId={(r) => r.id}
          onRowClick={(r) => onOpen(r.id)}
          emptyText={data ? t.common.notFound : t.common.loading}
          sort={controls.sort}
          filters={controls.filters}
          toolbar={{ search: <StudentSearch initial={search} onSearch={(term) => onChange({ ...view, search: term })} />, extra, total: data?.total, end: kinds }}
        />
      )}
      {data && (
        <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={(p) => onChange({ ...view, page: p })} />
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
