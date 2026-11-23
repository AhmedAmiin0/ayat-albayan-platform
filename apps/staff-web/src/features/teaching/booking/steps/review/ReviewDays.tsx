import { counted } from '@ab/shared';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { courseEnd, dayPicks } from '@/features/teaching/booking/draft/draft.days';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { dayAtText } from '@/features/teaching/booking/steps/slots/DayTimesList';
import { PACKAGE_NOTE_CLASS, packageDaysNote } from '@/features/teaching/booking/steps/package/package-days';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

/** Null without a course or picks. */
export function courseEndText(d: BookingDraft): string | null {
  const end = courseEnd(d);
  if (!end || !d.course) return null;
  return counted(t.booking.courseEnds, d.course.lessonsTotal).replace('{date}', dateLabel(end));
}

/** The admin sees the package note; the assistant's course its end. */
export function ReviewDays({ draft }: { draft: BookingDraft }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const picks = dayPicks(draft);
  const note = draft.course ? null : packageDaysNote(draft.pkg, picks.length);
  const ends = courseEndText(draft);
  return (
    <>
      <ul className="flex flex-wrap gap-x-1.5 tabular-nums">
        {picks.map((p, i) => (
          <li key={p.at}>
            {dayAtText(p, clock, draft.tz)}
            {i < picks.length - 1 && <span aria-hidden="true"> ·</span>}
          </li>
        ))}
        <li className="text-ink-2">({counted(t.booking.perWeek, picks.length)})</li>
      </ul>
      {ends && <p className="mt-1 text-xs font-semibold text-ink-2">{ends}</p>}
      {note && <p className={`mt-1 ${PACKAGE_NOTE_CLASS}`}>{note}</p>}
    </>
  );
}
