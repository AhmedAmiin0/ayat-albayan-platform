import type { PortalRecording } from '@ab/shared';
import { monthsOf } from '../../people/portal/index.js';

/** Grouped by month on the family's clock, newest first as received. */
export const recordingMonths = (
  rows: readonly PortalRecording[],
  tz: string,
): { month: string; rows: PortalRecording[] }[] =>
  monthsOf(rows, (row) => row.lesson_starts_at, tz);

/** How many parts each recorded lesson has. */
export function partsByLesson(rows: readonly PortalRecording[]): Map<string, number> {
  const parts = new Map<string, number>();
  for (const row of rows) parts.set(row.lesson_id, (parts.get(row.lesson_id) ?? 0) + 1);
  return parts;
}

/** «44» minutes of a recording (rounded; an unknown length reads 0). */
export const recordingMinutes = (seconds: number | null): string =>
  String(Math.round((seconds ?? 0) / 60));

export interface PartWords {
  partOption: string;
}

/** Oldest first, since they arrive newest first. */
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
