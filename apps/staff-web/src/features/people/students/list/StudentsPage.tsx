import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { TableBox } from '@/components/data-table/TableBox';
import { Button, Cartouche, EmptyState, Icon, PageHead, Pager, Toast, t } from '@ab/web-kit';
import { studentListQuery, studentStatusCountsQuery } from '@/features/people/students/api';
import { BulkAssign } from '@/features/people/assistants/students/BulkAssign';
import { useStudentPick } from '@/features/people/assistants/students/use-student-pick';
import { CreateStudentDialog } from '@/features/people/students/create/CreateStudentDialog';
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

/** Any search, filter or sort change goes back to page 1 (R-STU-01..03, R-NFR-08). */
export function StudentsPage({
  search,
  page,
  filters = {},
  sort,
  columns: colFilters,
  onChange,
  onOpen,
}: StudentsPageProps) {
  const { data, isError } = useQuery(
    studentListQuery(search, page, { filters, sort, columns: colFilters }),
  );
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
    onClearAll: (keys) =>
      onChange({ ...view, filters: {}, columns: withoutKeys(colFilters, keys) }),
  });

  return (
    <>
      <PageHead>
        <Cartouche>{t.students.title}</Cartouche>
        {data && (
          // One count form for every n; Arabic plural forms come when copy needs them.
          <span className="text-sm text-ink-3 tabular-nums">{t.students.count.replace('{n}', String(data.total))}</span>
        )}
        <div className="ms-auto flex gap-2.5 max-sm:w-full max-sm:[&>*]:flex-1">
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
        // One primary action per screen, and the head already holds it.
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
          toolbar={{
            search: (
              <StudentSearch
                initial={search}
                onSearch={(term) => onChange({ ...view, search: term })}
              />
            ),
            extra,
            total: data?.total,
            end: kinds,
          }}
        />
      )}
      {data && (
        <Pager
          page={page}
          total={data.total}
          pageSize={data.pageSize}
          onPage={(p) => onChange({ ...view, page: p })}
        />
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
      {/* Keyed so the merge toast gets its own full 10 s after the register one (journey 6). */}
      {notice && <Toast key={notice} message={notice} duration={10_000} onDismiss={dismiss} />}
    </>
  );
}
