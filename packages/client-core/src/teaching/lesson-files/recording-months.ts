import type { PortalRecording } from '@ab/shared';
import { monthsOf } from '../../people/portal/index.js';

/** «التسجيلات» under their month on the family's clock, newest first as they came. */
export const recordingMonths = (
  rows: readonly PortalRecording[],
  tz: string,
): { month: string; rows: PortalRecording[] }[] =>
  monthsOf(rows, (row) => row.lesson_starts_at, tz);

/** A lesson recorded in parts («مسجّلة في جزأين»): how many parts each lesson has. */
export function partsByLesson(rows: readonly PortalRecording[]): Map<string, number> {
  const parts = new Map<string, number>();
  for (const row of rows) parts.set(row.lesson_id, (parts.get(row.lesson_id) ?? 0) + 1);
  return parts;
}
