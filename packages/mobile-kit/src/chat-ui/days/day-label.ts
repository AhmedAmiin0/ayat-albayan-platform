import { chatDay, type ChatDay, clockOf, type ClockCycle, dateText, dayParts } from '@ab/time';
import { t } from '../../lib/i18n/i18n';
import { locale } from '../../lib/i18n/locale';

// The day separators of a chat, as WhatsApp: the staff inbox and the student
// channel word a day the same way, in the viewer's zone; the day logic is the shared chatDay.

const DAY_MONTH = { day: 'numeric', month: 'long' } as const;
const DAY_MONTH_YEAR = { ...DAY_MONTH, year: 'numeric' } as const;
const pad = (n: number): string => String(n).padStart(2, '0');

interface DayClock {
  now: Date;
  tz: string;
}

/** The calendar date at noon UTC, formatted in UTC: the same day whatever the device's zone. */
function dateWords(day: ChatDay, clock: DayClock): string {
  if (day.kind !== 'date') return '';
  const year = day.year ?? dayParts(clock.now, clock.tz).year;
  const at = new Date(`${year}-${pad(day.month)}-${pad(day.day)}T12:00:00Z`);
  return dateText(at, { tz: 'UTC', locale }, day.year === null ? DAY_MONTH : DAY_MONTH_YEAR);
}

const weekdayWord = (day: ChatDay): string => {
  const weekdays: Readonly<Record<string, string>> = t.enums.weekday;
  return weekdays[day.kind === 'weekday' ? String(day.weekday) : ''] ?? '';
};

const WORDS: Readonly<Record<ChatDay['kind'], (day: ChatDay, clock: DayClock) => string>> = {
  today: () => t.inbox.dayToday,
  yesterday: () => t.inbox.dayYesterday,
  weekday: weekdayWord,
  date: dateWords,
};

/** Today, yesterday, a weekday within six days, else the date (year if not this year). */
export function chatDayLabel(iso: string, clock: DayClock): string {
  const day = chatDay(new Date(iso), clock);
  return WORDS[day.kind](day, clock);
}

/** The clock today, else chatDayLabel; empty without a valid time. */
export function chatRowTime(
  iso: string | null | undefined,
  clock: DayClock & { cycle: ClockCycle },
): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '';
  const at = new Date(iso);
  if (chatDay(at, clock).kind !== 'today') return chatDayLabel(iso, clock);
  return clockOf(at, { tz: clock.tz, cycle: clock.cycle, locale });
}
