import { SLOTS, SUN_17 } from '@/reschedule/fixtures';
import { done, lesson } from '@/today/fixtures';
import type { EditableLesson, TimeEditResult } from './types';

export { NOW, SLOTS, SAT_17, SUN_17 } from '@/reschedule/fixtures';

// Rows in the GET /lessons shape with the R-SCH-11 fields. «Now» is Thursday 1 Oct 2026 16:20
// Riyadh (reschedule/fixtures NOW); the teacher is in Cairo (also UTC+3 in October).

/** Sunday 4 Oct 17:00 Riyadh, 45 min, waiting for the guardian: the edit moves it. */
export const upcoming: EditableLesson = {
  ...lesson({ id: 'l-up', starts_at: SUN_17, ends_at: '2026-10-04T14:45:00.000Z' }),
  time_edit_mode: 'move',
};

/** Thursday 1 Oct 10:00 Riyadh, held for 45 min: the edit corrects what was recorded. */
export const held: EditableLesson = { ...done, time_edit_mode: 'correct' };

/** The slots response with the grid the sheet asks for. */
export const GRID = { ...SLOTS, step_min: 15 };

/** PATCH answer for `lesson` after the edit. */
export function result(over: Partial<TimeEditResult> = {}): TimeEditResult {
  return { lesson: upcoming, notified: 0, payout: 'none', pdf_refresh: false, ...over };
}
