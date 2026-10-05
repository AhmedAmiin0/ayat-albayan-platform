import { GENDERS, LESSON_STATUSES, PROGRAMS, type OverviewTeacher } from '@ab/shared';
import { CheckboxFilterField, SelectFilterField } from '@/components/table-toolbar/fields';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { t } from '@/lib/i18n';
import { CLEAR_SCHEDULE_FILTERS, scheduleChips } from './schedule-filters';
import type { ScheduleSearch } from './search';
import { TeacherPicker } from './TeacherPicker';

export interface ScheduleFiltersProps {
  search: ScheduleSearch;
  /** Every teacher of the overview, for the picker (the filters run on the client). */
  teachers: readonly OverviewTeacher[];
  onSearch: (patch: Partial<ScheduleSearch>) => void;
  /** The lessons shown after the filters: «عرض النتائج (14)». Unknown while the week loads. */
  resultCount?: number | undefined;
}

const pick = <T extends string>(list: readonly T[], value: string): T | undefined => list.find((x) => x === value);
const all = (label: string) => ({ value: '', label });

/**
 * Teachers / program / gender / status filters + «إظهار الملغاة…» (R-SCH-01) on the shared toolbar
 * (owner, 2026-10-05): one «تصفية» button with the set filters as chips under it, the same as the tables.
 */
export function ScheduleFilters({ search, teachers, onSearch, resultCount }: ScheduleFiltersProps) {
  const fields = (
    <>
      <TeacherPicker inline teachers={teachers} value={search.teachers ?? []} onChange={(ids) => onSearch({ teachers: ids.length ? ids : undefined })} />
      <SelectFilterField
        label={t.schedule.programFilter}
        value={search.program}
        options={[all(t.schedule.allPrograms), ...PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }))]}
        onChange={(v) => onSearch({ program: pick(PROGRAMS, v) })}
      />
      <SelectFilterField
        label={t.teachers.gender}
        value={search.gender}
        options={[all(t.booking.genderAny), ...GENDERS.map((g) => ({ value: g, label: t.teachers.genderLabel[g] }))]}
        onChange={(v) => onSearch({ gender: pick(GENDERS, v) })}
      />
      <SelectFilterField
        label={t.schedule.statusFilter}
        value={search.status}
        options={[all(t.schedule.allStatuses), ...LESSON_STATUSES.map((s) => ({ value: s, label: t.enums.lessonStatus[s] }))]}
        onChange={(v) => onSearch({ status: pick(LESSON_STATUSES, v) })}
      />
      <CheckboxFilterField label={t.schedule.showClosed} checked={search.closed === true} onChange={(on) => onSearch({ closed: on || undefined })} />
    </>
  );
  return (
    <TableToolbar
      fields={fields}
      chips={scheduleChips({ search, teachers, onSearch })}
      onClearAll={() => onSearch(CLEAR_SCHEDULE_FILTERS)}
      resultCount={resultCount}
    />
  );
}
