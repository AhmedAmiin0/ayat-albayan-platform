import { FamilyHeader, FamilyPage } from '@/nav';
import { WeekBody } from '@/schedule/WeekBody';
import { WeekNav } from '@/schedule/WeekNav';
import { useScheduleScreen } from './use-schedule-screen';

/** docs/50 §6: one academy week of lessons still ahead, on this phone's clock. */
export function ScheduleScreen() {
  const { week, child, refresh, title } = useScheduleScreen();
  return (
    <FamilyPage header={<FamilyHeader title={title} child={child} />} onRefresh={refresh}>
      <WeekNav offset={week.offset} range={week.range} onChange={week.setOffset} />
      <WeekBody week={week} />
    </FamilyPage>
  );
}
