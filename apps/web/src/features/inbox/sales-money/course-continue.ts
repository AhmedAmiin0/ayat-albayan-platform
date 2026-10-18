import { courseOpensOn, prefillPicks, type SalesCourseView } from '@ab/shared';
import type { BookingDraft } from '@/features/booking/draft';
import { dayAtText } from '@/features/booking/DayTimesList';
import type { BookHint } from '@/features/booking/hint';
import { dateLabel } from '@/features/schedule/tz';
import { WEEK_ORDER } from '@/features/teachers/grid';
import { t } from '@/lib/i18n';
import { courseDraft } from './course-draft';

// «تابِع بنفس الأيام» (owner 2026-10-18): a renewal's course continues on the previous course's days
// and times, with its teacher, from the first day the new one may start (courseOpensOn). Pure.

export interface ContinuePlan {
  /** The course draft, the previous days kept as `course.prefilled`. */
  draft: BookingDraft;
  /** The previous teacher, preselected with the prefilled picks (teacherPatch). */
  hint: BookHint;
}

/** The wizard's draft and hint to continue on the same days; null without a bookable renewal. */
export function continuePlan(view: SalesCourseView, now: string): ContinuePlan | null {
  const previous = view.previous;
  const base = courseDraft(view);
  const from = courseOpensOn(view);
  if (!previous || !base?.course || !from || previous.days.length === 0) return null;
  const picks = prefillPicks({ days: previous.days, from, tz: view.student.tz, now });
  return {
    draft: { ...base, course: { ...base.course, prefilled: picks } },
    hint: { teacherId: previous.teacherId, startsAt: null, picks },
  };
}

const order = (w: number) => WEEK_ORDER.findIndex((x) => x === w);

/** «حلقات الباقة السابقة: السبت الساعة 17:00، الثلاثاء الساعة 19:30. تبدأ … من 3 نوفمبر 2026.» */
export function continueText(view: SalesCourseView): string {
  const days = [...(view.previous?.days ?? [])]
    .sort((a, b) => order(a.weekday) - order(b.weekday))
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, view.student.tz))
    .join(t.common.listSeparator);
  const from = courseOpensOn(view);
  return t.booking.courseChange.continueHint.replace('{days}', days).replace('{date}', from ? dateLabel(from) : '');
}
