import { lessonWhenAt, sameClockAt } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

/**
 * The lesson's time on the family's clock, and the viewer's time under it when their clock reads
 * differently at that instant (docs/34).
 */
export function LessonWhen({ startsAt, tz }: { startsAt: string; tz: string }) {
  const clock = useClock();
  const viewer = useViewerTz();
  const at = new Date(startsAt);
  const mine = sameClockAt(at, { a: tz, b: viewer }) ? null : lessonWhenAt(at, { tz: viewer, ...clock });
  return (
    <div className="grid gap-0.5">
      <p className="text-body font-semibold">{lessonWhenAt(at, { tz, ...clock })}</p>
      {mine && <p className="text-xs text-ink-3">{`${mine} ${t.schedule.viewerTime}`}</p>}
    </div>
  );
}
