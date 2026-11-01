import { inWeekOrder, type CourseChangeRequest, type DayTime } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { dayAtText } from '@/features/teaching/booking/steps/slots/DayTimesList';
import type { Clock } from '@/lib/clock';

/** The viewer's cycle, language and zone (useViewerTz()). */
type ZonedClock = Clock & { tz: string };

// «تغيير أيام الحلقات» (owner 2026-10-18): the current and the new days as one line each,
// السبت → الجمعة, each day with its own time in the course zone. Pure.

const daysText = (days: readonly DayTime[], tz: string, clock: ZonedClock): string =>
  inWeekOrder(days)
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, clock, tz))
    .join(t.common.listSeparator);

/** «الأيام الحالية: الأحد الساعة 17:00، الأربعاء الساعة 19:30». */
export const currentDaysText = (days: readonly DayTime[], tz: string, clock: ZonedClock): string =>
  t.booking.courseChange.currentDays.replace('{days}', daysText(days, tz, clock));

type RuleDays = Pick<CourseChangeRequest, 'byday' | 'startTimeLocal' | 'dayTimes'>;

/** The request's weekdays, each with its own time (dayTimes over startTimeLocal). */
export const requestDays = (req: RuleDays): DayTime[] =>
  req.byday.map((weekday) => ({
    weekday,
    startTimeLocal: req.dayTimes?.find((d) => d.weekday === weekday)?.startTimeLocal ?? req.startTimeLocal,
  }));

/** «الأيام الجديدة: الاثنين الساعة 18:00، الأربعاء الساعة 19:30». */
export const newDaysText = (req: RuleDays, tz: string, clock: ZonedClock): string =>
  t.booking.courseChange.newDays.replace('{days}', daysText(requestDays(req), tz, clock));
