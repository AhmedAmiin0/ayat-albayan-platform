import type { LessonStatus, OverviewTeacher } from '@ab/shared';
import { chipIfSet } from '@/components/table-toolbar/fields';
import type { FilterChip } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n/i18n';
import type { ScheduleSearch } from './search';
import { pickedLabel } from './TeacherPicker';

export interface ScheduleChipsOptions {
  search: ScheduleSearch;
  /** Every teacher of the overview, for the picked teachers' chip. */
  teachers: readonly OverviewTeacher[];
  onSearch: (patch: Partial<ScheduleSearch>) => void;
  /** A status's words (useLessonStatusText: «مجدولة» when no confirmation is required). */
  statusLabel?: (status: LessonStatus) => string;
}

/** «مسح الكل»: every schedule filter (the week / day navigation is not a filter). */
export const CLEAR_SCHEDULE_FILTERS: Partial<ScheduleSearch> = {
  teachers: undefined,
  program: undefined,
  gender: undefined,
  status: undefined,
  closed: undefined,
};

/** The set teachers, program, gender and status, and «إظهار الملغاة…», as removable chips. */
export function scheduleChips(options: ScheduleChipsOptions): FilterChip[] {
  const { search, teachers, onSearch } = options;
  const statusLabel = options.statusLabel ?? ((s: LessonStatus) => t.enums.lessonStatus[s]);
  const picked = search.teachers ?? [];
  return [
    ...chipIfSet({
      id: 'teachers',
      label: t.schedule.teacherFilter,
      value: picked.length > 0 ? 'picked' : undefined,
      text: pickedLabel(teachers, picked),
      onRemove: () => onSearch({ teachers: undefined }),
    }),
    ...chipIfSet({
      id: 'program',
      label: t.schedule.programFilter,
      value: search.program,
      text: search.program && t.enums.program[search.program],
      onRemove: () => onSearch({ program: undefined }),
    }),
    ...chipIfSet({
      id: 'gender',
      label: t.teachers.gender,
      value: search.gender,
      text: search.gender && t.teachers.genderLabel[search.gender],
      onRemove: () => onSearch({ gender: undefined }),
    }),
    ...chipIfSet({
      id: 'status',
      label: t.schedule.statusFilter,
      value: search.status,
      text: search.status && statusLabel(search.status),
      onRemove: () => onSearch({ status: undefined }),
    }),
    ...chipIfSet({
      id: 'closed',
      label: t.schedule.showClosed,
      value: search.closed ? 'closed' : undefined,
      text: t.common.yes,
      onRemove: () => onSearch({ closed: undefined }),
    }),
  ];
}
