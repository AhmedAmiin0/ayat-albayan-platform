import { CURRENT_STUDENT_STATUSES, STUDENT_STATUSES, type StudentStatus } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Pager } from '@/components/ui/layout/pager';
import { studentListQuery, studentStatusCountsQuery, type StatusCounts } from '@/features/people/students/api';
import { StatusChips } from '@/features/people/students/list/StatusChips';
import { setColumnFilter } from '@/features/people/students/list/search';
import { t } from '@/lib/i18n/i18n';
import type { FilterSearch, SortSearch } from '@/lib/list/list-search';
import { teacherStudentColumns } from './teacher-student-columns';
import { panelView } from './teacher-students-view';

/** The default view: her current students, not subscribed yet, subscribed and package ended (lessons keep running). */
export const CURRENT: readonly StudentStatus[] = CURRENT_STUDENT_STATUSES;

/** «١٢ مشترك · ٣ تجريبي · ٥ متوقف»: every status she has students in, in enum order. */
export function statusSummary(counts: StatusCounts): string {
  return STUDENT_STATUSES.filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${t.enums.studentStatus[s]}`)
    .join(' · ');
}

/**
 * «طلاب المعلم/ة» (R-TCH-03): the students list API with teacher fixed to her, status chips
 * (default: her current students, or every status), counts per status, and a link to the full list.
 * Columns sort and filter server-side (R-NFR-08); the state is local (a tab of the profile).
 */
export function TeacherStudentsPanel({ teacherId }: { teacherId: string }) {
  const [statuses, setStatuses] = useState<readonly StudentStatus[]>(CURRENT);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortSearch>({});
  const [columns, setColumns] = useState<FilterSearch>({});
  const list = useQuery(studentListQuery('', page, panelView({ teacherId, statuses, sort, columns })));
  const counts = useQuery(studentStatusCountsQuery({ teacher: teacherId }));
  const pick = (next: readonly StudentStatus[]) => {
    setStatuses(next);
    setPage(1);
  };
  const onSort = (next: { key?: string; dir?: SortSearch['dir'] }) => {
    setSort(next.key ? { sort: next.key, dir: next.dir } : {});
    setPage(1);
  };
  const onFilter = (key: string, value: string) => {
    setColumns(setColumnFilter(columns, { key, value }));
    setPage(1);
  };
  const onClearFilters = (keys: string[]) => {
    setColumns((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !keys.includes(k))));
    setPage(1);
  };
  const toggle = (s: StudentStatus) => pick(statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s]);
  const all = statuses.length === 0;

  return (
    <section aria-labelledby="teacher-students-title" className="grid gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="teacher-students-title" className="font-display text-xl font-bold">
          {t.teachers.studentsTitle}
        </h2>
        {counts.data && <span className="text-sm text-ink-3 tabular-nums">{statusSummary(counts.data)}</span>}
        <Link
          to="/admin/students"
          search={{ teacher: teacherId }}
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ms-auto' })}
        >
          {t.teachers.studentsViewAll}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusChips value={statuses} onToggle={toggle} counts={counts.data} />
        <Button variant="secondary" size="sm" onClick={() => pick(all ? CURRENT : [])}>
          {all ? t.teachers.studentsShowCurrent : t.teachers.studentsShowAll}
        </Button>
        {list.data && (
          <span className="ms-auto text-sm text-ink-3 tabular-nums">
            {t.students.count.replace('{n}', String(list.data.total))}
          </span>
        )}
      </div>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      <DataTable
        stacked
        columns={teacherStudentColumns}
        sort={{ key: sort.sort, dir: sort.dir, onChange: onSort }}
        filters={{ values: columns, onChange: onFilter, onClear: onClearFilters }}
        toolbar={{ total: list.isPlaceholderData ? undefined : list.data?.total }}
        data={list.data?.items ?? []}
        getRowId={(r) => r.id}
        emptyText={list.data ? t.teachers.studentsEmpty : t.common.loading}
      />
      {list.data && <Pager page={page} total={list.data.total} pageSize={list.data.pageSize} onPage={setPage} />}
    </section>
  );
}
