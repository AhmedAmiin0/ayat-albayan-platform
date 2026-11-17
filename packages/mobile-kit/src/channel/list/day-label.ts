import { chatDay, dateText, type ChatDay } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';
import { locale } from '../../lib/i18n/locale';

const DAY_MONTH = { day: 'numeric', month: 'long' } as const;
const DAY_MONTH_YEAR = { ...DAY_MONTH, year: 'numeric' } as const;

const thisYear = (day: ChatDay): boolean => day.kind === 'date' && day.year === null;
const weekdayOf = (day: ChatDay): string => (day.kind === 'weekday' ? String(day.weekday) : '');

/**
 * A day chip's words, as WhatsApp (owner 2026-10-27): «اليوم», «أمس», the weekday within the last
 * six days, else «29 سبتمبر» (with the year when it is not this year). The viewer's zone.
 */
export function channelDayLabel(iso: string, clock: { now: Date; tz: string }): string {
  const at = new Date(iso);
  const day = chatDay(at, clock);
  const weekdays: Readonly<Record<string, string>> = t.enums.weekday;
  const words: Readonly<Record<ChatDay['kind'], () => string>> = {
    today: () => t.inbox.dayToday,
    yesterday: () => t.inbox.dayYesterday,
    weekday: () => weekdays[weekdayOf(day)] ?? '',
    date: () =>
      dateText(at, { tz: clock.tz, locale }, thisYear(day) ? DAY_MONTH : DAY_MONTH_YEAR),
  };
  return words[day.kind]();
}
