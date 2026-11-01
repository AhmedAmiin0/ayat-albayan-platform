import { NO_TEACHER, teacherName, PROGRAMS, STUDENT_PACKAGE_FILTERS, tzChoices, tzOptionLabel } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { locale } from '@/core/lib/i18n/locale';
import { SORT_CHOICES, type FilterKey, type StudentFilters } from './student-filters';
import type { TeacherOption } from './use-student-list-data';

const S = t.students;
const L = t.mobileStudentFile.list;
const cities: Record<string, string | undefined> = t.tz;
type Pill = { value: string; label: string };

/** Each select filter's options, «الكل» first (value '' = no filter), as the web's studentFilterOptions. */
function filterOptions(teachers: TeacherOption[], tz: string): Record<Exclude<FilterKey, 'status'>, Pill[]> {
  return {
    teacher: [{ value: '', label: S.teacherAll }, { value: NO_TEACHER, label: S.teacherNone }, ...teachers.map((x) => ({ value: x.id, label: teacherName(x, locale) }))],
    program: [{ value: '', label: S.programAll }, ...PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }))],
    package: [{ value: '', label: S.packageAll }, ...STUDENT_PACKAGE_FILTERS.map((p) => ({ value: p, label: S.packageFilter[p] }))],
    weekly: [{ value: '', label: S.weeklyAll }, { value: 'yes', label: S.weeklyYes }, { value: 'no', label: S.weeklyNo }],
    tz: [{ value: '', label: S.tzAll }, ...tzChoices(tz).map((id) => ({ value: id, label: tzOptionLabel(id, cities[id]) }))],
  };
}

const LABELS: Record<Exclude<FilterKey, 'status'>, string> = {
  teacher: S.teacher,
  program: S.program,
  package: S.package,
  weekly: S.weeklyFilter,
  tz: S.tz,
};

interface StudentFilterGroupsProps {
  value: StudentFilters;
  teachers: TeacherOption[];
  onChange: (next: StudentFilters) => void;
}

/** The panel's groups: sort, then teacher, program, package, weekly and time zone, each a wrapping pill group. */
export function StudentFilterGroups({ value, teachers, onChange }: StudentFilterGroupsProps) {
  const options = filterOptions(teachers, value.tz);
  const sorts = SORT_CHOICES.map((s) => ({ value: s, label: L.sort[s] }));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 4 }}>
        <SectionLabel>{L.sortLabel}</SectionLabel>
        <FilterPills wrap items={sorts} value={value.sort} onChange={(sort) => onChange({ ...value, sort })} accessibilityLabel={L.sortLabel} />
      </View>
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
        <View key={key} style={{ gap: 4 }}>
          <SectionLabel>{LABELS[key]}</SectionLabel>
          <FilterPills wrap items={options[key]} value={value[key]} onChange={(v) => onChange({ ...value, [key]: v })} accessibilityLabel={LABELS[key]} />
        </View>
      ))}
    </View>
  );
}
