import { addDays, riyadhMidnight } from '@/calendar/week';

/** GET /assistants/me/lessons `from`/`to` for one Riyadh day (YYYY-MM-DD): [00:00, next 00:00). */
export function assistantDay(date: string): { from: string; to: string } {
  return { from: riyadhMidnight(date), to: riyadhMidnight(addDays(date, 1)) };
}
