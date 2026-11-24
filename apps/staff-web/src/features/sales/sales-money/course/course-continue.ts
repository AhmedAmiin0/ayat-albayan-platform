import { courseOpensOn, inWeekOrder, prefillDays, type SalesCourseView } from '@ab/shared';
import { counted } from '@ab/core';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { dayAtText } from '@/features/teaching/booking/steps/slots/DayTimesList';
import type { BookHint } from '@/features/teaching/booking/hint';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { courseDraft } from './course-draft';
import type { Clock } from '@ab/web-kit/lib/clock';

/** The viewer's cycle, language and zone (useViewerTz()). */
type ZonedClock = Clock & { tz: string };

// A renewal continues on the previous days, teacher and times from courseOpensOn, not before today.

export interface ContinuePlan {
  /** The course draft, the previous days kept as `course.prefilled` (each with its own time). */
  draft: BookingDraft;
  /** The previous teacher, preselected with the prefilled picks (teacherPatch). */
  hint: BookHint;
}

/**
 * The wizard's draft and hint to continue on the same days; null without a bookable renewal. A
 * `from` weeks in the past rolls each day forward to its coming week (prefillDays).
 */
export function continuePlan(view: SalesCourseView, now: string): ContinuePlan | null {
  const previous = view.previous;
  const base = courseDraft(view, now);
  const from = courseOpensOn(view, now);
  if (!previous || !base?.course || !from || previous.days.length === 0) return null;
  const prefilled = prefillDays({ days: previous.days, from, tz: view.student.tz, now });
  const picks = prefilled.map((p) => p.at);
  return {
    draft: { ...base, course: { ...base.course, prefilled } },
    hint: { teacherId: previous.teacherId, startsAt: null, picks },
  };
}

const previousDays = (view: SalesCourseView, clock: ZonedClock): string =>
  inWeekOrder(view.previous?.days ?? [])
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, clock, view.student.tz))
    .join(t.common.listSeparator);

/** For days saved before the payment (view.draft) the text says they await payment. */
export function continueText(view: SalesCourseView, clock: ZonedClock, now?: string): string {
  const from = courseOpensOn(view, now);
  const line = view.draft ? t.booking.courseChange.draftHint : t.booking.courseChange.continueHint;
  return line.replace('{days}', previousDays(view, clock)).replace('{date}', from ? dateLabel(from) : '');
}

/** A different day count (!continueFits) asks to adjust the previous days to the new count. */
export const adjustText = (view: SalesCourseView, clock: ZonedClock): string =>
  counted(t.booking.courseChange.continueAdjust, view.perWeek ?? 0).replace('{days}', previousDays(view, clock));
