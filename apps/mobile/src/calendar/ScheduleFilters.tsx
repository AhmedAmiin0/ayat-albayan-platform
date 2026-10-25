import { GENDERS, PROGRAMS } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import type { ScheduleView, TeacherFilter } from './overview';
import { dayLabel } from './week';

export interface ScheduleFiltersProps {
  view: ScheduleView;
  filter: TeacherFilter;
  /** Day view: the week's days with their lesson counts; the picked one is `date`. */
  days: { date: string; count: number }[] | null;
  date: string;
  onView: (view: ScheduleView) => void;
  onFilter: (filter: TeacherFilter) => void;
  onDate: (date: string) => void;
}

const viewPills = (): FilterPill<ScheduleView>[] => [
  { value: 'day', label: t.schedule.viewDay },
  { value: 'week', label: t.schedule.viewWeek },
];
const programPills = (): FilterPill<TeacherFilter['program']>[] => [
  { value: 'all', label: t.schedule.allPrograms },
  ...PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] })),
];
const genderPills = (): FilterPill<TeacherFilter['gender']>[] => [
  { value: 'all', label: t.booking.genderAny },
  ...GENDERS.map((g) => ({ value: g, label: t.teachers.genderLabel[g] })),
];

/** اليوم | الأسبوع, the week's day pills with counts (day view), then program and gender. */
export function ScheduleFilters({ view, filter, days, date, ...on }: ScheduleFiltersProps) {
  return (
    <View style={{ gap: 4, paddingTop: 4 }}>
      <FilterPills
        role="radiogroup"
        accessibilityLabel={t.schedule.viewLabel}
        items={viewPills()}
        value={view}
        onChange={on.onView}
      />
      {days ? (
        <FilterPills
          accessibilityLabel={t.schedule.week}
          items={days.map((d) => ({ value: d.date, label: dayLabel(d.date), count: d.count }))}
          value={date}
          onChange={on.onDate}
        />
      ) : null}
      <FilterPills
        accessibilityLabel={t.schedule.programFilter}
        items={programPills()}
        value={filter.program}
        onChange={(program) => on.onFilter({ ...filter, program })}
      />
      <FilterPills
        accessibilityLabel={t.teachers.gender}
        items={genderPills()}
        value={filter.gender}
        onChange={(gender) => on.onFilter({ ...filter, gender })}
      />
    </View>
  );
}
