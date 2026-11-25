import { inWeekOrder } from '@ab/shared';
import type { CourseChangeRequest, DayTime } from '@ab/schedule';
import { t } from '@ab/web-kit';
import { dayAtText } from '@/features/teaching/booking/steps/slots/DayTimesList';
import type { Clock } from '@ab/web-kit';

/** The viewer's cycle, language and zone (useViewerTz()). */
type ZonedClock = Clock & { tz: string };

// Saturday to Friday, each day with its own time in the course zone; pure.

export const daysText = (days: readonly DayTime[], tz: string, clock: ZonedClock): string =>
  inWeekOrder(days)
    .map((d) => dayAtText({ weekday: d.weekday, time: d.startTimeLocal }, clock, tz))
    .join(t.common.listSeparator);

export const currentDaysText = (days: readonly DayTime[], tz: string, clock: ZonedClock): string =>
  t.booking.courseChange.currentDays.replace('{days}', daysText(days, tz, clock));

type RuleDays = Pick<CourseChangeRequest, 'byday' | 'startTimeLocal' | 'dayTimes'>;

/** The request's weekdays, each with its own time (dayTimes over startTimeLocal). */
export const requestDays = (req: RuleDays): DayTime[] =>
  req.byday.map((weekday) => ({
    weekday,
    startTimeLocal: req.dayTimes?.find((d) => d.weekday === weekday)?.startTimeLocal ?? req.startTimeLocal,
  }));

export const newDaysText = (req: RuleDays, tz: string, clock: ZonedClock): string =>
  t.booking.courseChange.newDays.replace('{days}', daysText(requestDays(req), tz, clock));
