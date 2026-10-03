import { GENDERS, LESSON_STATUSES, PROGRAMS, type OverviewTeacher } from '@ab/shared';
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import type { ScheduleSearch } from './search';
import { TeacherPicker } from './TeacherPicker';

export interface ScheduleFiltersProps {
  search: ScheduleSearch;
  /** Every teacher of the overview, for the picker (the filters run on the client). */
  teachers: readonly OverviewTeacher[];
  onSearch: (patch: Partial<ScheduleSearch>) => void;
}

const selectClass = 'h-10 w-full sm:w-auto sm:min-w-[160px]';

/** Teachers / program / gender / status filters + «إظهار الملغية…» (R-SCH-01). */
export function ScheduleFilters({ search, teachers, onSearch }: ScheduleFiltersProps) {
  const id = useId();
  const pick = <T extends string>(list: readonly T[], value: string): T | undefined => list.find((x) => x === value);

  return (
    <div role="group" aria-label={t.schedule.filters} className="grid grid-cols-2 items-end gap-x-3 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-4">
      <TeacherPicker teachers={teachers} value={search.teachers ?? []} onChange={(ids) => onSearch({ teachers: ids.length ? ids : undefined })} />
      <div className="grid w-full gap-1.5 sm:w-auto">
        <Label htmlFor={`${id}-p`}>{t.schedule.programFilter}</Label>
        <Select id={`${id}-p`} className={selectClass} value={search.program ?? ''} onChange={(e) => onSearch({ program: pick(PROGRAMS, e.target.value) })}>
          <option value="">{t.schedule.allPrograms}</option>
          {PROGRAMS.map((p) => (
            <option key={p} value={p}>{t.enums.program[p]}</option>
          ))}
        </Select>
      </div>
      <div className="grid w-full gap-1.5 sm:w-auto">
        <Label htmlFor={`${id}-g`}>{t.teachers.gender}</Label>
        <Select id={`${id}-g`} className={selectClass} value={search.gender ?? ''} onChange={(e) => onSearch({ gender: pick(GENDERS, e.target.value) })}>
          <option value="">{t.booking.genderAny}</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>{t.teachers.genderLabel[g]}</option>
          ))}
        </Select>
      </div>
      <div className="grid w-full gap-1.5 sm:w-auto">
        <Label htmlFor={`${id}-s`}>{t.schedule.statusFilter}</Label>
        <Select id={`${id}-s`} className={selectClass} value={search.status ?? ''} onChange={(e) => onSearch({ status: pick(LESSON_STATUSES, e.target.value) })}>
          <option value="">{t.schedule.allStatuses}</option>
          {LESSON_STATUSES.map((s) => (
            <option key={s} value={s}>{t.enums.lessonStatus[s]}</option>
          ))}
        </Select>
      </div>
      <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm sm:col-auto sm:min-h-10">
        <input
          type="checkbox"
          checked={search.closed === true}
          onChange={(e) => onSearch({ closed: e.target.checked || undefined })}
          className="size-4 accent-[var(--lapis)]"
        />
        <span>{t.schedule.showClosed}</span>
      </label>
    </div>
  );
}
