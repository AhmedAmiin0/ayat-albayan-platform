import { chatDayKey, type ClockCycle } from '@ab/time';
import { chatDayLabel, chatRowTime } from '@ab/mobile-kit';
import { deviceTimeZone } from '@/inbox/messages/hooks/message-text';

// Day labels use the device zone like every time in the thread; logic is the shared chatDay.

interface DayOptions {
  now?: Date;
  tz?: string;
}

/** The separator's words for the day of `iso` (the kit's chatDayLabel, in the device's zone). */
export function dayLabel(
  iso: string,
  { now = new Date(), tz = deviceTimeZone() }: DayOptions = {},
): string {
  return chatDayLabel(iso, { now, tz });
}

/**
 * A chat row's time, as WhatsApp's chat list: the clock today, else the day's words (dayLabel); ''
 * without a valid time. `now` is the list's one clock (useToday): no hidden `new Date()` that the
 * React Compiler would keep from the first render.
 */
export function rowTime(
  iso: string | null | undefined,
  cycle: ClockCycle,
  { now, tz = deviceTimeZone() }: DayOptions & { now: Date },
): string {
  return chatRowTime(iso, { now, tz, cycle });
}

/**
 * Whether rows[index] (newest first, as the inverted list holds them) is the first message of its
 * day: the older neighbour above it, if any, is another day. The oldest loaded row always opens one.
 */
export function opensDay(
  rows: readonly { created_at: string }[],
  index: number,
  tz = deviceTimeZone(),
): boolean {
  const row = rows[index];
  if (!row) return false;
  const older = rows[index + 1];
  return (
    !older ||
    chatDayKey(new Date(older.created_at), tz) !== chatDayKey(new Date(row.created_at), tz)
  );
}

/** Whether rows[index] shows its day chip: the oldest loaded row only once no older page (`more`) can continue its day. */
export function hasDayChip(
  rows: readonly { created_at: string }[],
  index: number,
  more: boolean,
): boolean {
  return opensDay(rows, index) && (index < rows.length - 1 || !more);
}
