import { GENDERS, type Gender, type Program } from '@ab/shared';
import { SearchInput } from '@/components/ui/form/search-input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import type { TeacherFilter } from './teacher-view';

export interface TeacherFiltersProps {
  value: TeacherFilter;
  /** The programs offered (the ones some teacher teaches). */
  programs: readonly Program[];
  onChange: (next: TeacherFilter) => void;
}

const isProgram = (all: readonly Program[], v: string): v is Program => all.some((p) => p === v);
const isGender = (v: string): v is Gender => GENDERS.some((g) => g === v);

/** «المعلمون» toolbar: search by name, then program and gender (native selects, labelled). Wraps on phones. */
export function TeacherFilters({ value, programs, onChange }: TeacherFiltersProps) {
  return (
    <div role="search" className="mb-4 flex flex-wrap items-center gap-2">
      <div className="min-w-[200px] flex-[2_1_240px]">
        <SearchInput
          aria-label={t.sales.teachers.search}
          placeholder={t.sales.teachers.search}
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
        />
      </div>
      <Select
        aria-label={t.sales.teachers.programs}
        className="flex-[1_1_160px] sm:w-auto"
        value={value.program}
        onChange={(e) => onChange({ ...value, program: isProgram(programs, e.target.value) ? e.target.value : '' })}
      >
        <option value="">{t.schedule.allPrograms}</option>
        {programs.map((p) => (
          <option key={p} value={p}>
            {t.enums.program[p]}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t.sales.teachers.gender}
        className="flex-[1_1_120px] sm:w-auto"
        value={value.gender}
        onChange={(e) => onChange({ ...value, gender: isGender(e.target.value) ? e.target.value : '' })}
      >
        <option value="">{t.sales.teachers.allGenders}</option>
        {GENDERS.map((g) => (
          <option key={g} value={g}>
            {t.teachers.genderLabel[g]}
          </option>
        ))}
      </Select>
    </div>
  );
}
