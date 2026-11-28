import { STUDENT_PACKAGE_FILTERS, STUDENT_WEEKLY_FILTERS } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import type { StudentListView } from '@/features/people/students';
import type { FilterSearch, SortSearch } from '@/lib/list/list-search';

export interface PanelState {
  teacherId: string;
  statuses: readonly StudentStatus[];
  sort: SortSearch;
  /** Column filters by key: code / name (text), package / weekly (the R-STU-01 selects). */
  columns: FilterSearch;
}

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
