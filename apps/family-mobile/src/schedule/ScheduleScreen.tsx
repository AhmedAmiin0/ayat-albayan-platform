import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useRefreshPortal } from '@/portal';
import { useWeek } from './use-week';
import { WeekBody } from './WeekBody';
import { WeekNav } from './WeekNav';

/**
 * «الجدول» (docs/50 §6, canvas StudentSchedule): one academy week of the lessons still ahead on
 * this phone's clock, of the student in view («جدولي» for a student's own).
 */
export function ScheduleScreen() {
  const week = useWeek();
  const refresh = useRefreshPortal();
  const S = t.portal.app.schedule;
  return (
    <FamilyPage header={<FamilyHeader title={week.own ? S.mine : S.title} />} onRefresh={refresh}>
      <WeekNav offset={week.offset} range={week.range} onChange={week.setOffset} />
      <WeekBody week={week} />
    </FamilyPage>
  );
}
