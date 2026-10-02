import { LESSON_STATUSES, PROGRAMS } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { teacherOptionsQuery } from '@/features/students/api';
import { t } from '@/lib/i18n';
import type { ScheduleSearch } from './search';
import { addDays, dayMonthLabel } from './tz';

export interface ScheduleFiltersProps {
  week: string;
  thisWeek: string;
  search: ScheduleSearch;
  onSearch: (patch: Partial<ScheduleSearch>) => void;
}

const selectClass = 'h-10 w-full sm:w-auto sm:min-w-[160px]';

/** Week navigation + teacher / program / status filters + «إظهار الملغية…» (R-SCH-01). */
export function ScheduleFilters({ week, thisWeek, search, onSearch }: ScheduleFiltersProps) {
  const id = useId();
  const teachers = useQuery(teacherOptionsQuery);
  const pick = <T extends string>(list: readonly T[], value: string): T | undefined => list.find((x) => x === value);

  return (
    <div role="group" aria-label={t.schedule.filters} className="mb-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onSearch({ week: addDays(week, -7) })}>
          <Icon name="chevron-right" />
          {t.schedule.prevWeek}
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={week === thisWeek} onClick={() => onSearch({ week: undefined })}>
          {t.schedule.thisWeek}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onSearch({ week: addDays(week, 7) })}>
          {t.schedule.nextWeek}
          <Icon name="chevron-left" />
        </Button>
        <span className="ms-1 text-sm font-semibold tabular-nums">{t.schedule.weekOf.replace('{date}', dayMonthLabel(week))}</span>
        <span className="text-xs text-ink-3">{t.schedule.riyadhTime}</span>
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="grid w-full gap-1.5 sm:w-auto">
          <Label htmlFor={`${id}-t`}>{t.schedule.teacherFilter}</Label>
          <Select id={`${id}-t`} className={selectClass} value={search.teacher ?? ''} onChange={(e) => onSearch({ teacher: e.target.value || undefined })}>
            <option value="">{t.schedule.allTeachers}</option>
            {teachers.data?.map((x) => (
              <option key={x.id} value={x.id}>{x.display_name_ar}</option>
            ))}
          </Select>
        </div>
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
          <Label htmlFor={`${id}-s`}>{t.schedule.statusFilter}</Label>
          <Select id={`${id}-s`} className={selectClass} value={search.status ?? ''} onChange={(e) => onSearch({ status: pick(LESSON_STATUSES, e.target.value) })}>
            <option value="">{t.schedule.allStatuses}</option>
            {LESSON_STATUSES.map((s) => (
              <option key={s} value={s}>{t.enums.lessonStatus[s]}</option>
            ))}
          </Select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-10">
          <input
            type="checkbox"
            checked={search.closed === true}
            onChange={(e) => onSearch({ closed: e.target.checked || undefined })}
            className="size-4 accent-[var(--lapis)]"
          />
          <span>{t.schedule.showClosed}</span>
        </label>
      </div>
    </div>
  );
}
