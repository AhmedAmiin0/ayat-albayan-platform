import { intlLocale, type Glyph, type LessonRecordingView, type Tone } from '@ab/shared';
import { locale } from '@/lib/locale';

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

/** The start of a recording: date + 24 h time in the app language, Western digits (`timeZone` is a test seam). */
export function recordingTime(iso: string, timeZone = 'Asia/Riyadh'): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso));
}

/** GET /lessons/:id/recordings or /meetings/:id/recordings. */
export const recordingsPath = (source: RecordingSource): string => `/${source.kind}s/${source.id}/recordings`;
