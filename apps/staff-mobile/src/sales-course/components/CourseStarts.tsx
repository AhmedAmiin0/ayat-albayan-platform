import type { SalesCourseView } from '@ab/shared';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import { localDay } from '@/core/lib/money/format';

/** Days are picked from the subscription start on. */
export function CourseStarts({ subscription }: { subscription: SalesCourseView['subscription'] }) {
  const { color } = useTheme();
  if (!subscription) return null;
  return (
    <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
      {t.booking.subscriptionStarts.replace('{date}', localDay(subscription.starts_on))}
    </AppText>
  );
}
