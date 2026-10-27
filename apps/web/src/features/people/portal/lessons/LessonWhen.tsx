import { lessonWhenAt, RIYADH_TZ } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';

/** The lesson's time on the family's clock, and the Riyadh time under it when that clock is another one. */
export function LessonWhen({ startsAt, tz }: { startsAt: string; tz: string }) {
  const clock = useClock();
  const at = new Date(startsAt);
  return (
    <div className="grid gap-0.5">
      <p className="text-body font-semibold">{lessonWhenAt(at, { tz, ...clock })}</p>
      {tz !== RIYADH_TZ && <p className="text-xs text-ink-3">{`${lessonWhenAt(at, { tz: RIYADH_TZ, ...clock })} ${t.schedule.riyadhTime}`}</p>}
    </div>
  );
}
