import { counted } from '@ab/shared';
import { dateLabel } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { courseEnd, dayPicks } from '../../draft/draft.days';
import type { BookingDraft } from '../../draft/draft';
import { dayAtText } from '../slots/DayTimesList';
import { PACKAGE_NOTE_CLASS, packageDaysNote } from '../package/package-days';

/** «تنتهي الدورة في 27 أكتوبر 2026 بعد 8 حلقات»; null without a course or picks. */
export function courseEndText(d: BookingDraft): string | null {
  const end = courseEnd(d);
  if (!end || !d.course) return null;
  return counted(t.booking.courseEnds, d.course.lessonsTotal).replace('{date}', dateLabel(end));
}

/**
 * The review's weekly days, each with its time (owner 2026-10-18): «الأحد الساعة 17:00 · الثلاثاء
 * الساعة 19:30 (مرتان في الأسبوع)». The admin sees the package note; the assistant's course its end.
 */
export function ReviewDays({ draft }: { draft: BookingDraft }) {
  const picks = dayPicks(draft);
  const note = draft.course ? null : packageDaysNote(draft.pkg, picks.length);
  const ends = courseEndText(draft);
  return (
    <>
      <ul className="flex flex-wrap gap-x-1.5 tabular-nums">
        {picks.map((p, i) => (
          <li key={p.at}>
            {dayAtText(p, draft.tz)}
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
