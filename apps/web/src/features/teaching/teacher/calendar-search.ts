import { z } from 'zod';

// /teacher/calendar?view= «جدولي» (docs/48 PR3; owner 2026-11-14): the week grid of her lessons,
// or her availability (moved here from the home). A plain link opens the lessons.

export const CALENDAR_VIEWS = ['lessons', 'availability'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/** Optional; junk reads as none, not an error. */
const calendarSearch = z.object({ view: z.enum(CALENDAR_VIEWS).optional().catch(undefined) });
export type TeacherCalendarSearch = z.infer<typeof calendarSearch>;

export const parseTeacherCalendarSearch = (
  search: Record<string, unknown>,
): TeacherCalendarSearch => calendarSearch.parse(search);
