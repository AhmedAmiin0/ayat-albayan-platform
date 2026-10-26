import { useMemo } from 'react';
import { DataTable, type DataTableFilters, type DataTableSort, type FilterOption } from '@/components/DataTable';
import { t } from '@/lib/i18n/i18n';
import { feedbackColumns } from './feedback-columns';
import type { FeedbackListRow } from './types';

export interface FeedbackTableProps {
  rows: FeedbackListRow[];
  /** The admin sees the teacher column (and filters by `teachers`); a teacher's own list does not. */
  showTeacher: boolean;
  teachers?: FilterOption[];
  /** Server sort and column filters (R-NFR-08): the route's URL state. */
  sort: DataTableSort;
  filters: DataTableFilters;
}

/** The feedback rows, sorted and filtered on the server (the list is paged). */
export function FeedbackTable({ rows, showTeacher, teachers, sort, filters }: FeedbackTableProps) {
  const columns = useMemo(() => feedbackColumns({ showTeacher, teachers: teachers ?? [] }), [showTeacher, teachers]);
  return (
    <DataTable
      stacked
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      emptyText={t.feedback.empty}
      sort={sort}
      filters={filters}
    />
  );
}
