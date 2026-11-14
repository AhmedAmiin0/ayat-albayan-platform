import { z } from 'zod';

// /teacher/calendar?period= «جدولي» (owner 2026-11-14): her week (the grid) or her month. A plain
// link opens the week. Her availability is its own page now (/teacher/availability).

export const CALENDAR_PERIODS = ['week', 'month'] as const;
export type CalendarPeriod = (typeof CALENDAR_PERIODS)[number];

/** Optional; junk reads as none, not an error. */
const calendarSearch = z.object({ period: z.enum(CALENDAR_PERIODS).optional().catch(undefined) });
export type TeacherCalendarSearch = z.infer<typeof calendarSearch>;

export const parseTeacherCalendarSearch = (
  search: Record<string, unknown>,
): TeacherCalendarSearch => calendarSearch.parse(search);
