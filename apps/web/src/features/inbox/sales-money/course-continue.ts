import { courseOpensOn, inWeekOrder, prefillDays, type SalesCourseView } from '@ab/shared';
import type { BookingDraft } from '@/features/booking/draft';
import { dayAtText } from '@/features/booking/DayTimesList';
import type { BookHint } from '@/features/booking/hint';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { courseDraft } from './course-draft';

// «تابِع بنفس الأيام» (owner 2026-10-18): a renewal's course continues on the previous course's days
// and times, with its teacher, from the first day the new one may start (courseOpensOn, never before
// today in the family's zone). Pure.

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

/** «حلقات الباقة السابقة: السبت الساعة 17:00، الثلاثاء الساعة 19:30. تبدأ … من 3 نوفمبر 2026.» */
export function continueText(view: SalesCourseView, now?: string): string {
  const days = inWeekOrder(view.previous?.days ?? [])
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, view.student.tz))
    .join(t.common.listSeparator);
  const from = courseOpensOn(view, now);
  return t.booking.courseChange.continueHint.replace('{days}', days).replace('{date}', from ? dateLabel(from) : '');
}
