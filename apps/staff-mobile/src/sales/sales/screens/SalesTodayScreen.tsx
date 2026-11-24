import type { SalesScheduleLesson } from '@ab/shared';
import { FamilyRequests, HeroCard, TodayLayout, type TodaySource } from '@/today';
import { SalesLessonSheet } from '@/sales/sales/components/SalesLessonSheet';
import { useSalesDay } from '@/sales/sales/lib/sales-api';

const SALES_DAY: TodaySource<SalesScheduleLesson> = { tree: 'sales', useDay: useSalesDay, schedule: '/sales/schedule' };

/** The admin's calm landing, read-only (docs/29); join only on a running lesson. */
export function SalesTodayScreen() {
  return (
    <TodayLayout
      source={SALES_DAY}
      requests={<FamilyRequests slotsPath="/sales/booking/slots" />}
      hero={(hero, onDetails) => <HeroCard hero={hero} onDetails={onDetails} />}
      sheet={(details) => <SalesLessonSheet lesson={details.lesson} onClose={details.close} />}
    />
  );
}
