import { chatDay, dateText, type ChatDay } from '@ab/shared';
import { t, locale } from '#/lib/i18n/index.ts';

// A day chip's words on the web (owner 2026-10-27, «like whatsapp»), worded from the shared
// chatDay in the student's time zone: «اليوم», «أمس», the weekday within the last six days, else
// «29 سبتمبر» (with the year when it is not this year).

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
