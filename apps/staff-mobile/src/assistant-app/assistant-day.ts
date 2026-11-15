import { addDays, riyadhMidnight } from '@/calendar/lib/week';

/** GET /assistants/me/lessons `from`/`to` for one Riyadh day (YYYY-MM-DD): [00:00, next 00:00). */
export function assistantDay(date: string): { from: string; to: string } {
  // academy day (docs/34 b): the day pages as the calendar's; times read in the viewer's zone.
  return { from: riyadhMidnight(date), to: riyadhMidnight(addDays(date, 1)) };
}
