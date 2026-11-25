import { chatDay, dateText, type ChatDay } from '@ab/time';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// Day chip words from the shared chatDay in the student's zone; the year only when not this year.

interface DayClock {
  now: Date;
  tz: string;
}

type Words = (at: Date, day: ChatDay, clock: DayClock) => string;

const weekdays: Readonly<Record<string, string>> = t.enums.weekday;

const WORDS: Readonly<Record<ChatDay['kind'], Words>> = {
  today: () => t.inbox.dayToday,
  yesterday: () => t.inbox.dayYesterday,
  weekday: (_at, day) => (day.kind === 'weekday' ? (weekdays[String(day.weekday)] ?? '') : ''),
  date: (at, day, { tz }) => {
    const thisYear = day.kind === 'date' && day.year === null;
    const fields = thisYear
      ? ({ day: 'numeric', month: 'long' } as const)
      : ({ day: 'numeric', month: 'long', year: 'numeric' } as const);
    return dateText(at, { tz, locale }, fields);
  },
};

/** The chip over a day's first message. */
export function dayChipText(iso: string, clock: DayClock): string {
  const at = new Date(iso);
  const day = chatDay(at, clock);
  return WORDS[day.kind](at, day, clock);
}
