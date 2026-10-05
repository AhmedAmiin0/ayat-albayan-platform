import { PROGRAMS, STUDENT_PACKAGE_FILTERS, NO_TEACHER, tzChoices, tzOptionLabel } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { FilterOption } from '@/components/data-table-features';
import { SelectFilterField } from '@/components/table-toolbar/fields';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
import { teacherOptionsQuery } from './api';
import { selectedStatuses, setFilter, toggleStatus, type StudentsFilters } from './filters';
import { StatusChips } from './StatusChips';

export interface StudentFiltersProps {
  value: StudentsFilters;
  onChange: (next: StudentsFilters) => void;
}

const s = t.students;
type SelectKey = Exclude<keyof StudentsFilters, 'status'>;

/** Each select filter's options, «الكل» first (value '' = no filter); the teachers come from the API. */
export function studentFilterOptions(teachers: { id: string; display_name_ar: string }[], tz = ''): Record<SelectKey, FilterOption[]> {
  return {
    teacher: [
      { value: '', label: s.teacherAll },
      { value: NO_TEACHER, label: s.teacherNone },
      ...teachers.map((x) => ({ value: x.id, label: x.display_name_ar })),
    ],
    program: [{ value: '', label: s.programAll }, ...PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }))],
    package: [{ value: '', label: s.packageAll }, ...STUDENT_PACKAGE_FILTERS.map((p) => ({ value: p, label: s.packageFilter[p] }))],
    weekly: [
      { value: '', label: s.weeklyAll },
      { value: 'yes', label: s.weeklyYes },
      { value: 'no', label: s.weeklyNo },
    ],
    tz: [{ value: '', label: s.tzAll }, ...tzChoices(tz).map((id) => ({ value: id, label: tzOptionLabel(id, tzCity(id)) }))],
  };
}

export const STUDENT_SELECT_LABELS: Record<SelectKey, string> = {
  teacher: s.teacher,
  program: s.program,
  package: s.package,
  weekly: s.weeklyFilter,
  tz: s.tz,
};

/** The list filters (R-STU-01) in the «تصفية» panel: status chips, then teacher, program, package, weekly, tz. */
export function StudentFilters({ value, onChange }: StudentFiltersProps) {
  const teachers = useQuery(teacherOptionsQuery);
  const options = studentFilterOptions(teachers.data ?? [], value.tz);
  const keys = Object.keys(STUDENT_SELECT_LABELS) as SelectKey[];
  return (
    <>
      <div className="grid gap-1.5">
        <span aria-hidden="true" className="text-xs font-semibold text-ink-2">
          {s.status}
        </span>
        <StatusChips value={selectedStatuses(value)} onToggle={(st) => onChange(toggleStatus(value, st))} />
      </div>
      {keys.map((key) => (
        <SelectFilterField
          key={key}
          label={STUDENT_SELECT_LABELS[key]}
          value={value[key]}
          options={options[key]}
          onChange={(v) => onChange(setFilter(value, key, v))}
        />
      ))}
    </>
  );
}
