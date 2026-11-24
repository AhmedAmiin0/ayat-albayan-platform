import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { usePickedChild, useRefreshPortal } from '@/portal';
import { useWeek } from './use-week';
import { WeekBody } from './WeekBody';
import { WeekNav } from './WeekNav';

/** docs/50 §6: one academy week of lessons still ahead, on this phone's clock. */
export function ScheduleScreen() {
  const week = useWeek();
  const child = usePickedChild();
  const refresh = useRefreshPortal();
  const S = t.portal.app.schedule;
  const header = <FamilyHeader title={week.own ? S.mine : S.title} child={child} />;
  return (
    <FamilyPage header={header} onRefresh={refresh}>
      <WeekNav offset={week.offset} range={week.range} onChange={week.setOffset} />
      <WeekBody week={week} />
    </FamilyPage>
  );
}
