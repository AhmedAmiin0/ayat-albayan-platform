import { chatDay, chatDayKey, dayParts, intlLocale } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { deviceTimeZone } from '../hooks/message-text';

// The day separators of a chat, as WhatsApp (owner 2026-10-27): «اليوم», «أمس», the weekday within
// the last 6 days, else «29 سبتمبر» (and the year when it is not this year). The device's zone, as
// every time in the thread (stamp); the day logic is the shared chatDay.

interface DayOptions {
  now?: Date;
  tz?: string;
}

const dayMonth = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The separator's words for the day of `iso`. */
export function dayLabel(iso: string, { now = new Date(), tz = deviceTimeZone() }: DayOptions = {}): string {
  const day = chatDay(new Date(iso), { now, tz });
  if (day.kind === 'today') return t.inbox.dayToday;
  if (day.kind === 'yesterday') return t.inbox.dayYesterday;
  const weekdays: Record<string, string> = t.enums.weekday;
  if (day.kind === 'weekday') return weekdays[String(day.weekday)] ?? '';
  // The calendar date at noon UTC, formatted in UTC: the same day whatever the device's zone.
  const at = new Date(Date.UTC(day.year ?? dayParts(now, tz).year, day.month - 1, day.day, 12));
  return (day.year === null ? dayMonth : dayMonthYear).format(at);
}

/**
 * Whether rows[index] (newest first, as the inverted list holds them) is the first message of its
 * day: the older neighbour above it, if any, is another day. The oldest loaded row always opens one.
 */
export function opensDay(rows: readonly { created_at: string }[], index: number, tz = deviceTimeZone()): boolean {
  const row = rows[index];
  if (!row) return false;
  const older = rows[index + 1];
  return !older || chatDayKey(new Date(older.created_at), tz) !== chatDayKey(new Date(row.created_at), tz);
}
