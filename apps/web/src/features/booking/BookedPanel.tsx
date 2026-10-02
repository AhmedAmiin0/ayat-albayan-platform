import { counted, type BookingResult } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { RIYADH_TZ, weekStart, zonedParts } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { pickedText } from './SlotStep';

export interface BookedPanelProps {
  result: BookingResult;
  teacherId: string;
  /** The family's zone, for the first lesson's local time. */
  tz: string;
}

/** After POST /booking: what was created, the queued WhatsApp confirmation, and the way to the week. */
export function BookedPanel({ result, teacherId, tz }: BookedPanelProps) {
  const first = result.lessons.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const week = first ? weekStart(zonedParts(new Date(first.starts_at), RIYADH_TZ).date) : undefined;
  return (
    <section aria-labelledby="booked-title" className="grid justify-items-start gap-3 py-2">
      <h2 id="booked-title" role="status" className="flex items-center gap-2 font-display text-h3 font-bold">
        <NuqtaGlyph shape="fill" className="text-ok" />
        <span>{t.booking.booked}</span>
      </h2>
      {first && <p>{t.booking.firstLesson.replace('{when}', pickedText(first.starts_at, tz))}</p>}
      <p className="text-sm text-ink-2 tabular-nums">{counted(t.schedule.lessonCount, result.lessons.length)}</p>
      {result.message_ids.length > 0 && <p className="text-sm text-ink-2">{t.booking.confirmationNote}</p>}
      <Link to="/admin/schedule" search={{ week, teacher: teacherId }} className={buttonVariants()}>
        {t.booking.openSchedule}
      </Link>
    </section>
  );
}
