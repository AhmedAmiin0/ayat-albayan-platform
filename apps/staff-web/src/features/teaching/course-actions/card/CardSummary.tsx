import type { CourseCardView } from '@ab/shared';
import { courseDaysText } from '@/features/teaching/booking';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { cardLines } from './card-text';

/**
 * The card's course lines (owner 2026-11-17): the days and times in the viewer's zone, «المعلم/ة ·
 * آخر حلقة في …», «بقيت حلقتان بلا مواعيد» in the act ink; before a course is booked, says so.
 */
export function CardSummary({ card }: { card: CourseCardView }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const course = card.course;
  if (!course) {
    const empty = card.subscriptionId ? t.courseCard.noCourse : t.courseCard.noPackage;
    return <p className="text-sm text-ink-2">{empty}</p>;
  }
  const lines = cardLines(course);
  return (
    <div className="grid gap-1 text-sm">
      <p className="font-semibold text-ink">{courseDaysText(course.days, course.tz, clock)}</p>
      <p className="text-ink-2">{lines.teacher}</p>
      {lines.unbooked && <p className="font-semibold text-act">{lines.unbooked}</p>}
    </div>
  );
}
