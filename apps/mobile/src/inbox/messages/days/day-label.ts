import { chatDay, chatDayKey, type ClockCycle, dateText, dayParts } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { clock, deviceTimeZone } from '@/inbox/messages/hooks/message-text';

// The day separators of a chat, as WhatsApp (owner 2026-10-27): «اليوم», «أمس», the weekday within
// the last 6 days, else «29 سبتمبر» (and the year when it is not this year). The device's zone, as
// every time in the thread (stamp); the day logic is the shared chatDay.

interface DayOptions {
  now?: Date;
  tz?: string;
}

const DAY_MONTH = { day: 'numeric', month: 'long' } as const;
const DAY_MONTH_YEAR = { ...DAY_MONTH, year: 'numeric' } as const;
const pad = (n: number): string => String(n).padStart(2, '0');

/** The separator's words for the day of `iso`. */
export function dayLabel(iso: string, { now = new Date(), tz = deviceTimeZone() }: DayOptions = {}): string {
  const day = chatDay(new Date(iso), { now, tz });
  if (day.kind === 'today') return t.inbox.dayToday;
  if (day.kind === 'yesterday') return t.inbox.dayYesterday;
  const weekdays: Record<string, string> = t.enums.weekday;
  if (day.kind === 'weekday') return weekdays[String(day.weekday)] ?? '';
  // The calendar date at noon UTC, formatted in UTC: the same day whatever the device's zone.
  const at = new Date(`${day.year ?? dayParts(now, tz).year}-${pad(day.month)}-${pad(day.day)}T12:00:00Z`);
  return dateText(at, { tz: 'UTC', locale }, day.year === null ? DAY_MONTH : DAY_MONTH_YEAR);
}

/**
 * A chat row's time, as WhatsApp's chat list: the clock today, else the day's words (dayLabel); ''
 * without a valid time. `now` is the list's one clock (useToday): no hidden `new Date()` that the
 * React Compiler would keep from the first render.
 */
export function rowTime(iso: string | null | undefined, cycle: ClockCycle, { now, tz = deviceTimeZone() }: DayOptions & { now: Date }): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '';
  return chatDay(new Date(iso), { now, tz }).kind === 'today' ? clock(iso, cycle, tz) : dayLabel(iso, { now, tz });
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

/** Whether rows[index] shows its day chip: the oldest loaded row only once no older page (`more`) can continue its day. */
export function hasDayChip(rows: readonly { created_at: string }[], index: number, more: boolean): boolean {
  return opensDay(rows, index) && (index < rows.length - 1 || !more);
}
