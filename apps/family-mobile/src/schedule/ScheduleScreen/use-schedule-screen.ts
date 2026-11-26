import { t } from '@ab/mobile-kit';
import { usePickedChild, useRefreshPortal } from '@/portal';
import { useWeek } from '@/schedule/use-week';

export function useScheduleScreen() {
  const week = useWeek();
  const S = t.portal.app.schedule;
  return {
    week,
    child: usePickedChild(),
    refresh: useRefreshPortal(),
    title: week.own ? S.mine : S.title,
  };
}
