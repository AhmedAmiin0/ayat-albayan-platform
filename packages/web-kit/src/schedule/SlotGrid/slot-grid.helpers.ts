import { weekdayOf } from '@ab/time';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { dayMonthLabel } from '@ab/web-kit/schedule/tz';

const weekday: Record<string, string> = t.enums.weekday;

/** A day column's heading: the weekday name, then the day and month. */
export const dayLabel = (day: string): string =>
  `${weekday[String(weekdayOf(day))] ?? ''} ${dayMonthLabel(day)}`;
