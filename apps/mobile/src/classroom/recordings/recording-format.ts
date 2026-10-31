import { viewerTz } from '@ab/client-core';
import { dateText, type ClockCycle, type Glyph, type LessonRecordingView, type Tone } from '@ab/shared';
import { clockIn, dateWithClock } from '@/core/lib/clock';
import { locale } from '@/core/lib/i18n/locale';

/** Where a recording list comes from: a lesson (admin, its teacher) or an internal meeting (admin, creator). */
export interface RecordingSource {
  kind: 'lesson' | 'meeting';
  id: string;
}

/** Status chip of a recording: under way = act, ready = ok, failed = bad (glyph + word, never colour alone). */
export const RECORDING_CHIP: Record<LessonRecordingView['status'], { tone: Tone; glyph: Glyph }> = {
  recording: { tone: 'act', glyph: 'half' },
  done: { tone: 'ok', glyph: 'fill' },
  failed: { tone: 'bad', glyph: 'struck' },
};

/** The start of a recording: date + time (12 or 24 h) in the app language, Western digits in the viewer's zone. */
export function recordingTime(iso: string, cycle: ClockCycle, timeZone = viewerTz()): string {
  const at = new Date(iso);
  const day = dateText(at, { tz: timeZone, locale }, { day: 'numeric', month: 'short' });
  return dateWithClock(day, clockIn(at, timeZone, cycle));
}

/** GET /lessons/:id/recordings or /meetings/:id/recordings. */
export const recordingsPath = (source: RecordingSource): string => `/${source.kind}s/${source.id}/recordings`;
