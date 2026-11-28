import type { Glyph, Tone } from '@ab/money';
import type { LessonRecordingView } from '@ab/schedule';
import { dateText, type ClockCycle } from '@ab/time';
import { clockIn, dateWithClock } from '@/core/lib/clock';
import { locale } from '@ab/mobile-kit';

/** A recording list's source: a lesson (admin, its teacher) or a meeting (admin, creator). */
export interface RecordingSource {
  kind: 'lesson' | 'meeting';
  id: string;
}

/** Recording status chip: under way = act, ready = ok, failed = bad (glyph + word, not colour). */
export const RECORDING_CHIP: Record<LessonRecordingView['status'], { tone: Tone; glyph: Glyph }> = {
  recording: { tone: 'act', glyph: 'half' },
  done: { tone: 'ok', glyph: 'fill' },
  failed: { tone: 'bad', glyph: 'struck' },
};

/** Recording start: date + time (12/24 h) in the app language, Western digits, viewer's zone. */
export function recordingTime(iso: string, cycle: ClockCycle, timeZone: string): string {
  const at = new Date(iso);
  const day = dateText(at, { tz: timeZone, locale }, { day: 'numeric', month: 'short' });
  return dateWithClock(day, clockIn(at, timeZone, cycle));
}

/** GET /lessons/:id/recordings or /meetings/:id/recordings. */
export const recordingsPath = (source: RecordingSource): string => `/${source.kind}s/${source.id}/recordings`;
