import { intlLocale, type LessonRecordingView, type Tone } from '@ab/shared';
import { locale } from '@/lib/locale';

/** Status chip of a recording: under way = act, ready = ok, failed = bad. */
export const RECORDING_TONE: Record<LessonRecordingView['status'], Tone> = {
  recording: 'act',
  done: 'ok',
  failed: 'bad',
};

/**
 * The start of a recording in the viewer's own zone (the browser's), date + 24 h time, Western
 * digits. `timeZone` is a test seam.
 */
export function recordingTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timeZone && { timeZone }),
  }).format(new Date(iso));
}
