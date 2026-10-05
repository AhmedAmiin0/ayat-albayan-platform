import { PROGRAMS, STUDENT_PACKAGE_FILTERS, NO_TEACHER, tzChoices, tzOptionLabel } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/select';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { teacherOptionsQuery } from './api';
import { selectedStatuses, setFilter, toggleStatus, type StudentsFilters } from './filters';
import { StatusChips } from './StatusChips';

export interface StudentFiltersProps {
  value: StudentsFilters;
  onChange: (next: StudentsFilters) => void;
  /** One column (inside the phone sheet) instead of a wrapping row. */
  stacked?: boolean;
}

type Option = { value: string; label: string };
const s = t.students;

/** The list filters (R-STU-01): status chips, then teacher, program, package, weekly, tz selects. */
export function StudentFilters({ value, onChange, stacked = false }: StudentFiltersProps) {
  const teachers = useQuery(teacherOptionsQuery);
  const select = (key: keyof StudentsFilters, label: string, options: Option[]) => (
    <Select
      aria-label={label}
      value={value[key] ?? ''}
      onChange={(e) => onChange(setFilter(value, key, e.target.value))}
      className={cn('w-auto min-w-0', stacked ? 'w-full' : 'flex-1 sm:min-w-[140px] sm:flex-none')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
  return (
    <div className={cn('flex gap-2.5', stacked ? 'flex-col items-stretch' : 'flex-wrap items-center')}>
      <StatusChips value={selectedStatuses(value)} onToggle={(st) => onChange(toggleStatus(value, st))} />
      {select('teacher', s.teacher, [
        { value: '', label: s.teacherAll },
        { value: NO_TEACHER, label: s.teacherNone },
        ...(teachers.data ?? []).map((x) => ({ value: x.id, label: x.display_name_ar })),
      ])}
      {select('program', s.program, [
        { value: '', label: s.programAll },
        ...PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] })),
      ])}
      {select('package', s.package, [
        { value: '', label: s.packageAll },
        ...STUDENT_PACKAGE_FILTERS.map((p) => ({ value: p, label: s.packageFilter[p] })),
      ])}
      {select('weekly', s.weekly, [
        { value: '', label: s.weeklyAll },
        { value: 'yes', label: s.weeklyYes },
        { value: 'no', label: s.weeklyNo },
      ])}
      {select('tz', s.tz, [
        { value: '', label: s.tzAll },
        ...tzChoices(value.tz ?? '').map((id) => ({ value: id, label: tzOptionLabel(id, tzCity(id)) })),
      ])}
    </div>
  );
}
