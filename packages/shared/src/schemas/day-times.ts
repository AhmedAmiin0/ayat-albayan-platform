import { z } from 'zod';
import { bookingKindOf, type BookingKind } from './booking-extras.js';
import { timeOfDay } from './common.js';

// Per-weekday times of a package booking (owner 2026-10-18). Kept apart from scheduling.ts (file
// size); scheduling.ts adds `dayTimes` to the booking body and refines it here.

/** One weekday with a time that differs from the booking's startTimeLocal. */
export const dayTimeSchema = z.object({ weekday: z.int().min(0).max(6), startTimeLocal: timeOfDay });

/** Optional: absent = every byday at startTimeLocal (old clients behave exactly as before). */
export const dayTimesSchema = z.array(dayTimeSchema).max(7).optional();

type DayTimeFacts = {
  kind?: BookingKind | undefined;
  package?: string | undefined;
  byday: number[];
  dayTimes?: { weekday: number }[] | undefined;
};

/** day_not_in_byday, duplicate_day, package_only (a trial or a makeup is one lesson at one time). */
export function refineDayTimes(req: DayTimeFacts, ctx: z.RefinementCtx): void {
  const days = req.dayTimes ?? [];
  if (days.length === 0) return;
  const issue = (message: string) => ctx.addIssue({ code: 'custom', path: ['dayTimes'], message });
  if (bookingKindOf(req) !== 'package') issue('package_only');
  if (days.some((d) => !req.byday.includes(d.weekday))) issue('day_not_in_byday');
  if (new Set(days.map((d) => d.weekday)).size !== days.length) issue('duplicate_day');
}
