import { intlLocale, type LessonRecordingView, type Tone } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { dateAndClock, viewerZone } from '@/lib/clock-text';
import { locale } from '@/lib/i18n/locale';

/** Status chip of a recording: under way = act, ready = ok, failed = bad. */
export const RECORDING_TONE: Record<LessonRecordingView['status'], Tone> = {
  recording: 'act',
  done: 'ok',
  failed: 'bad',
};

/**
 * The start of a recording in the viewer's own zone (the browser's), date + time in the viewer's
 * cycle (12 or 24 h), Western digits. `timeZone` is a test seam.
 */
export function recordingTime(iso: string, clock: Clock, timeZone = viewerZone()): string {
  const day = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', timeZone });
  return dateAndClock(day, new Date(iso), { ...clock, tz: timeZone });
}
