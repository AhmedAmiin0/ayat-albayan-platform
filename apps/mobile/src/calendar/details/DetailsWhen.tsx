import { RIYADH_TZ } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { DetailsGroup, DetailsLine } from './DetailsGroup';
import { clockLines, lengthLine, seriesLine, whenLine, type DetailsLesson } from './details-text';
import { useClockCycle, whenIn } from '@/core/lib/clock';

/**
 * «الموعد»: the Riyadh date and time first (the screen's clock), each student's and the teacher's
 * own clock under it, the length, the weekly series it belongs to and, for a makeup, the missed
 * lesson it replaces («لا تُخصم من الباقة»).
 */
export function DetailsWhen({ lesson }: { lesson: DetailsLesson }) {
  const cycle = useClockCycle();
  const length = lengthLine(lesson);
  const series = seriesLine(lesson, cycle);
  const missed = lesson.makeup_of;
  return (
    <DetailsGroup label={t.schedule.time}>
      <DetailsLine tone="ink">{whenLine(lesson, cycle)}</DetailsLine>
      {clockLines(lesson, cycle).map((line) => (
        <DetailsLine key={line}>{line}</DetailsLine>
      ))}
      {length ? <DetailsLine>{`${t.schedule.duration}: ${length}`}</DetailsLine> : null}
      {series ? <DetailsLine>{series}</DetailsLine> : null}
      {missed ? (
        <DetailsLine>
          {`${t.booking.makeup.missedLabel}: ${whenIn(new Date(missed.starts_at), RIYADH_TZ, cycle)} · ${t.booking.makeup.noUnit}`}
        </DetailsLine>
      ) : null}
    </DetailsGroup>
  );
}
