import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { usePickedChild, useRefreshPortal } from '@/portal';
import { useWeek } from './use-week';
import { WeekBody } from './WeekBody';
import { WeekNav } from './WeekNav';

/**
 * «الجدول» (docs/50 §6, canvas StudentSchedule): one academy week of the lessons still ahead on
 * this phone's clock, of the student in view («جدولي» for a student's own; a guardian of several
 * reads the picked child's name under the title).
 */
export function ScheduleScreen() {
  const week = useWeek();
  const child = usePickedChild();
  const refresh = useRefreshPortal();
  const S = t.portal.app.schedule;
  const header = <FamilyHeader title={week.own ? S.mine : S.title} subtitle={child?.name} />;
  return (
    <FamilyPage header={header} onRefresh={refresh}>
      <WeekNav offset={week.offset} range={week.range} onChange={week.setOffset} />
      <WeekBody week={week} />
    </FamilyPage>
  );
}
