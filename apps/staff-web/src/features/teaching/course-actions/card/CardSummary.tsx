import type { CourseCardView } from '@ab/shared';
import { courseDaysText } from '@/features/teaching/booking';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { cardLines, packageLines } from './card-text';

type Course = NonNullable<CourseCardView['course']>;
interface Row {
  text: string;
  tone: string;
}
const QUIET = 'text-ink-2';

/** «8 حلقات · 3 من 8 حلقة · دُفع … من …» and «يُتوقع أن تنتهي يوم …» (when known). */
function packageRows(card: CourseCardView, tz: string): Row[] {
  const pkg = card.package ? packageLines(card.package, tz) : null;
  if (!pkg) return [];
  const end = pkg.end ? [{ text: pkg.end, tone: QUIET }] : [];
  return [{ text: pkg.line, tone: `${QUIET} tabular-nums` }, ...end];
}

/** The days and times, «المعلم/ة · آخر حلقة في …», «بقيت حلقتان بلا مواعيد» (act ink). */
function courseRows(course: Course, days: string): Row[] {
  const lines = cardLines(course);
  const unbooked = lines.unbooked ? [{ text: lines.unbooked, tone: 'font-semibold text-act' }] : [];
  return [{ text: days, tone: 'font-semibold text-ink' }, { text: lines.teacher, tone: QUIET }, ...unbooked];
}

/**
 * The card's lines (owner 2026-11-17, board CourseXWebPanel): the package, then the course in the
 * viewer's zone; before a course is booked, says so.
 */
export function CardSummary({ card }: { card: CourseCardView }) {
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const course = card.course;
  const empty = card.subscriptionId ? t.courseCard.noCourse : t.courseCard.noPackage;
  const rows = course
    ? courseRows(course, courseDaysText(course.days, course.tz, clock))
    : [{ text: empty, tone: QUIET }];
  return (
    <div className="grid gap-1 text-sm">
      {[...packageRows(card, tz), ...rows].map((row) => (
        <p key={row.text} className={row.tone}>
          {row.text}
        </p>
      ))}
    </div>
  );
}
