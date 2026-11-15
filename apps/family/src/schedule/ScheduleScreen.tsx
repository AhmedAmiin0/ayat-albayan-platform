import type { PortalStudent } from '@ab/shared';
import { FilterPills, t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useRefreshPortal } from '@/portal';
import { ALL, useWeek } from './use-week';
import { WeekBody } from './WeekBody';
import { WeekNav } from './WeekNav';

/** «الكل» and one chip per child (a guardian with more than one). */
const chips = (students: readonly PortalStudent[]) => [
  { value: ALL, label: t.portal.app.schedule.all },
  ...students.map((s) => ({ value: s.id, label: s.name })),
];

/**
 * «الجدول» (docs/50 §6, canvas Schedule / StudentSchedule): one academy week of the lessons still
 * ahead on this phone's clock; a guardian's across every child with filter chips, a student's own.
 */
export function ScheduleScreen() {
  const week = useWeek();
  const refresh = useRefreshPortal();
  const S = t.portal.app.schedule;
  const chipsShown = week.named && week.students.length > 1;
  return (
    <FamilyPage header={<FamilyHeader title={week.named ? S.title : S.mine} />} onRefresh={refresh}>
      <WeekNav offset={week.offset} range={week.range} onChange={week.setOffset} />
      {chipsShown ? (
        <FilterPills
          items={chips(week.students)}
          value={week.chip}
          onChange={week.setChip}
          accessibilityLabel={S.filter}
        />
      ) : null}
      <WeekBody week={week} />
    </FamilyPage>
  );
}
