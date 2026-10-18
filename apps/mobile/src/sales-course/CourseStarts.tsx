import type { SalesCourseView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/ui/AppText';
import { type, useTheme } from '@/theme';

/** «يبدأ الاشتراك في 25 أكتوبر 2026» under the course's title: its days are picked from then on. */
export function CourseStarts({ subscription }: { subscription: SalesCourseView['subscription'] }) {
  const { color } = useTheme();
  if (!subscription) return null;
  return (
    <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
      {t.booking.subscriptionStarts.replace('{date}', localDay(subscription.starts_on))}
    </AppText>
  );
}
