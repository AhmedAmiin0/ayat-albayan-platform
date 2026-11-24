import { t } from '@ab/mobile-kit';
import { DetailsGroup, DetailsLine } from './DetailsGroup';
import { clockLines, lengthLine, seriesLine, whenLine, type DetailsLesson } from './details-text';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';

/** A makeup shows the missed lesson it replaces, which is not deducted from the package. */
export function DetailsWhen({ lesson }: { lesson: DetailsLesson }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const length = lengthLine(lesson);
  const series = seriesLine(lesson, cycle);
  const missed = lesson.makeup_of;
  const missedAt = missed ? whenIn(new Date(missed.starts_at), tz, cycle) : '';
  return (
    <DetailsGroup label={t.schedule.time}>
      <DetailsLine tone="ink">{whenLine(lesson, cycle, tz)}</DetailsLine>
      {clockLines(lesson, cycle, tz).map((line) => (
        <DetailsLine key={line}>{line}</DetailsLine>
      ))}
      {length ? <DetailsLine>{`${t.schedule.duration}: ${length}`}</DetailsLine> : null}
      {series ? <DetailsLine>{series}</DetailsLine> : null}
      {missed ? (
        <DetailsLine>
          {`${t.booking.makeup.missedLabel}: ${missedAt} · ${t.booking.makeup.noUnit}`}
        </DetailsLine>
      ) : null}
    </DetailsGroup>
  );
}
