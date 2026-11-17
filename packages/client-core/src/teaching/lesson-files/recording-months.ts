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

/** «44» minutes of a recording (rounded; an unknown length reads 0). */
export const recordingMinutes = (seconds: number | null): string =>
  String(Math.round((seconds ?? 0) / 60));

/** The words a «الجزء 1 · 31 دقيقة» choice needs (the app's t.lessonFiles). */
export interface PartWords {
  partOption: string;
}

/** A lesson's parts oldest first (they came newest first), each named «الجزء n · m دقيقة». */
export function partChoices<R extends Pick<PortalRecording, 'id' | 'duration_seconds'>>(
  rows: readonly R[],
  words: PartWords,
): { value: string; label: string; row: R }[] {
  return [...rows].reverse().map((row, i) => ({
    value: row.id,
    label: words.partOption
      .replace('{n}', String(i + 1))
      .replace('{minutes}', recordingMinutes(row.duration_seconds)),
    row,
  }));
}
