import type { SalesScheduleLesson } from '@ab/shared';
import { FamilyRequests, HeroCard, TodayLayout, type TodaySource } from '@/today';
import { SalesLessonSheet } from '@/sales/sales/components/SalesLessonSheet';
import { useSalesDay } from '@/sales/sales/lib/sales-api';

/** The lessons «جدول الحلقات» shows today (every teacher); «جدول الغد» to that tab. */
const SALES_DAY: TodaySource<SalesScheduleLesson> = { tree: 'sales', useDay: useSalesDay, schedule: '/sales/schedule' };

/**
 * «اليوم» of the salesperson (owner 2026-10-27, docs/29): the admin's calm landing, read-only. The
 * same header, summary filters, hero, rest and ended fold over the academy day of her «جدول
 * الحلقات», never more; the hero and rows open the read-only «تفاصيل الحلقة». No تأكيد, إلغاء or
 * move anywhere; «ادخل الحلقة» only on a running lesson, as the schedule. «طلبات الأسر»: her
 * families' «اطلب موعدًا آخر», which she answers (owner 2026-11-17).
 */
export function SalesTodayScreen() {
  return (
    <TodayLayout
      source={SALES_DAY}
      requests={<FamilyRequests />}
      hero={(hero, onDetails) => <HeroCard hero={hero} onDetails={onDetails} />}
      sheet={(details) => <SalesLessonSheet lesson={details.lesson} onClose={details.close} />}
    />
  );
}
