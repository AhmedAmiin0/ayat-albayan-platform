import { lessonWhenText } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

/** «حجز من فجوة فاضية · السبت 15:00»: the gap clicked on the calendar, kept in sight on every step. */
export function GapChip({ startsAt }: { startsAt: string }) {
  const when = lessonWhenText(new Date(startsAt), RIYADH_TZ, locale);
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-sm border border-gold-soft bg-gold-wash/40 px-2.5 py-1.5 text-sm font-medium">
      <Icon name="calendar" className="text-ink-3" />
      <span>{t.booking.gapChip.replace('{when}', when)}</span>
    </p>
  );
}
