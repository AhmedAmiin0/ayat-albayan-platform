import { useQuery } from '@tanstack/react-query';
import type { ExtraFilters, FilterChip } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n/i18n';
import { teacherOptionsQuery } from './api';
import { selectedStatuses, setFilter, toggleStatus, type StudentsFilters } from './filters';
import { STUDENT_SELECT_LABELS, StudentFilters, studentFilterOptions } from './StudentFilters';

export interface StudentFiltersOptions {
  value: StudentsFilters;
  onChange: (next: StudentsFilters) => void;
  /** «مسح الكل»: these filters and the given column filter keys, in one URL change. */
  onClearAll: (columnKeys: string[]) => void;
}

/** One chip per checked status, then one per set select (its option's label). */
export function studentFilterChips(
  value: StudentsFilters,
  options: ReturnType<typeof studentFilterOptions>,
  onChange: (next: StudentsFilters) => void,
): FilterChip[] {
  const statuses = selectedStatuses(value).map((st) => ({
    id: `status:${st}`,
    label: t.students.status,
    value: t.enums.studentStatus[st],
    onRemove: () => onChange(toggleStatus(value, st)),
  }));
  const selects = (Object.keys(STUDENT_SELECT_LABELS) as (keyof typeof STUDENT_SELECT_LABELS)[]).flatMap((key) => {
    const v = value[key];
    if (!v) return [];
    const text = options[key].find((o) => o.value === v)?.label ?? v;
    return [{ id: key, label: STUDENT_SELECT_LABELS[key], value: text, onRemove: () => onChange(setFilter(value, key, '')) }];
  });
  return [...statuses, ...selects];
}

/** The students list filters (R-STU-01) as the table toolbar's extra filters. */
export function useStudentFilters({ value, onChange, onClearAll }: StudentFiltersOptions): ExtraFilters {
  const teachers = useQuery(teacherOptionsQuery);
  const options = studentFilterOptions(teachers.data ?? [], value.tz);
  return {
    fields: <StudentFilters value={value} onChange={onChange} />,
    chips: studentFilterChips(value, options, onChange),
    onClearAll,
  };
}
