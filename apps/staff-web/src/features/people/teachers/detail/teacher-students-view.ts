import { STUDENT_PACKAGE_FILTERS, STUDENT_WEEKLY_FILTERS, type StudentStatus } from '@ab/shared';
import type { StudentListView } from '@/features/people/students/api';
import type { FilterSearch, SortSearch } from '@/lib/list/list-search';

export interface PanelState {
  teacherId: string;
  statuses: readonly StudentStatus[];
  sort: SortSearch;
  /** Column filters by key: code / name (text), package / weekly (the R-STU-01 selects). */
  columns: FilterSearch;
}

/**
 * The profile tab's state → GET /students params: teacher fixed to her, the status chips, the
 * «الباقة» / «حلقة أسبوعية» column selects as the list's own filters, code / name as column text.
 */
export function panelView({ teacherId, statuses, sort, columns }: PanelState): StudentListView {
  const { package: pkg, weekly, ...text } = columns;
  return {
    filters: {
      teacher: teacherId,
      status: statuses.join(',') || undefined,
      package: STUDENT_PACKAGE_FILTERS.find((p) => p === pkg),
      weekly: STUDENT_WEEKLY_FILTERS.find((w) => w === weekly),
    },
    sort,
    columns: text,
  };
}
