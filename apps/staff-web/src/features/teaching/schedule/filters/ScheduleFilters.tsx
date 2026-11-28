import { GENDERS, LESSON_STATUSES, PROGRAMS } from '@ab/catalog';
import type { OverviewTeacher } from '@ab/schedule';
import { CheckboxFilterField, SelectFilterField } from '@/components/table-toolbar/fields';
import { TableToolbar } from '@/components/table-toolbar/TableToolbar';
import { t, useLessonStatusText } from '@ab/web-kit';
import { CLEAR_SCHEDULE_FILTERS, scheduleChips } from './schedule-filters';
import type { ScheduleSearch } from './search';
import { TeacherPicker } from './TeacherPicker';

export interface ScheduleFiltersProps {
  search: ScheduleSearch;
  /** Every teacher of the overview, for the picker (the filters run on the client). */
  teachers: readonly OverviewTeacher[];
  onSearch: (patch: Partial<ScheduleSearch>) => void;
  /** Unknown while the week loads. */
  resultCount?: number | undefined;
}

const pick = <T extends string>(list: readonly T[], value: string): T | undefined =>
  list.find((x) => x === value);
const all = (label: string) => ({ value: '', label });
const PROGRAM_OPTIONS = [
  all(t.schedule.allPrograms),
  ...PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] })),
];
const GENDER_OPTIONS = [
  all(t.booking.genderAny),
  ...GENDERS.map((g) => ({ value: g, label: t.teachers.genderLabel[g] })),
];

/** Schedule filters (R-SCH-01) as chips under one filter button, the same as the tables. */
export function ScheduleFilters({ search, teachers, onSearch, resultCount }: ScheduleFiltersProps) {
  // `scheduled` stays an option while no confirmation is required.
  const statusLabel = useLessonStatusText().label;
  const fields = (
    <>
      <TeacherPicker
        inline
        teachers={teachers}
        value={search.teachers ?? []}
        onChange={(ids) => onSearch({ teachers: ids.length ? ids : undefined })}
      />
      <SelectFilterField
        label={t.schedule.programFilter}
        value={search.program}
        options={PROGRAM_OPTIONS}
        onChange={(v) => onSearch({ program: pick(PROGRAMS, v) })}
      />
      <SelectFilterField
        label={t.teachers.gender}
        value={search.gender}
        options={GENDER_OPTIONS}
        onChange={(v) => onSearch({ gender: pick(GENDERS, v) })}
      />
      <SelectFilterField
        label={t.schedule.statusFilter}
        value={search.status}
        options={[
          all(t.schedule.allStatuses),
          ...LESSON_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
        ]}
        onChange={(v) => onSearch({ status: pick(LESSON_STATUSES, v) })}
      />
      <CheckboxFilterField
        label={t.schedule.showClosed}
        checked={search.closed === true}
        onChange={(on) => onSearch({ closed: on || undefined })}
      />
    </>
  );
  return (
    <TableToolbar
      fields={fields}
      chips={scheduleChips({ search, teachers, onSearch, statusLabel })}
      onClearAll={() => onSearch(CLEAR_SCHEDULE_FILTERS)}
      resultCount={resultCount}
    />
  );
}
