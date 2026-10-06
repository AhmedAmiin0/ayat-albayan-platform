import { addDays } from '@/calendar/week';
import { monthRange } from '@/money/months';

export const DATE_PRESETS = ['all', 'last7', 'last30', 'month'] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

/** The recordings filters: a date preset (no date picker, no new native module) and a teacher ('' = all). */
export interface RecordingFilters {
  preset: DatePreset;
  teacherId: string;
}

export const NO_FILTERS: RecordingFilters = { preset: 'all', teacherId: '' };

export const isFiltered = (f: RecordingFilters): boolean => f.preset !== 'all' || f.teacherId !== '';

/** The lesson day range (Riyadh days, both ends included) a preset stands for; `today` is YYYY-MM-DD. */
export function presetRange(preset: DatePreset, today: string): { from?: string; to?: string } {
  if (preset === 'last7') return { from: addDays(today, -6), to: today };
  if (preset === 'last30') return { from: addDays(today, -29), to: today };
  if (preset === 'month') return monthRange(today.slice(0, 7));
  return {};
}

/** GET /students/:id/recordings query: from / to / teacherId, only the ones set. */
export function recordingParams(f: RecordingFilters, today: string): Record<string, string | undefined> {
  return { ...presetRange(f.preset, today), teacherId: f.teacherId || undefined };
}
