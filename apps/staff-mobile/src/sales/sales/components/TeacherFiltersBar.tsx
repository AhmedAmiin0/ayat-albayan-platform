import type { SalesTeacherFilter } from '@ab/shared';
import { GENDERS, type Program } from '@ab/catalog';
import { View } from 'react-native';
import { t, FilterPills } from '@ab/mobile-kit';
import { SearchField } from '@/core/ui/form/SearchField';

interface TeacherFiltersBarProps {
  value: SalesTeacherFilter;
  programs: readonly Program[];
  onChange: (next: SalesTeacherFilter) => void;
}

export function TeacherFiltersBar({ value, programs, onChange }: TeacherFiltersBarProps) {
  return (
    <View style={{ gap: 8 }}>
      <SearchField compact label={t.sales.teachers.search} initial={value.q} onSearch={(q) => onChange({ ...value, q })} />
      <FilterPills<Program | ''>
        accessibilityLabel={t.sales.teachers.programs}
        items={[{ value: '', label: t.schedule.allPrograms }, ...programs.map((p) => ({ value: p, label: t.enums.program[p] }))]}
        value={value.program}
        onChange={(program) => onChange({ ...value, program })}
      />
      <FilterPills<SalesTeacherFilter['gender']>
        accessibilityLabel={t.sales.teachers.gender}
        items={[{ value: '', label: t.sales.teachers.allGenders }, ...GENDERS.map((g) => ({ value: g, label: t.teachers.genderLabel[g] }))]}
        value={value.gender}
        onChange={(gender) => onChange({ ...value, gender })}
      />
    </View>
  );
}
