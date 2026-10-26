import { lessonWhenText, RIYADH_TZ } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

/** The lesson's time on the family's clock, and the Riyadh time under it when that clock is another one. */
export function LessonWhen({ startsAt, tz }: { startsAt: string; tz: string }) {
  const at = new Date(startsAt);
  return (
    <div className="grid gap-0.5">
      <p className="text-body font-semibold">{lessonWhenText(at, tz, locale)}</p>
      {tz !== RIYADH_TZ && <p className="text-xs text-ink-3">{`${lessonWhenText(at, RIYADH_TZ, locale)} ${t.schedule.riyadhTime}`}</p>}
    </div>
  );
}
