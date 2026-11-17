import { fileLineOf, fileTitleOf, formatClock, megabytes } from '@ab/client-core';
import {
  clockOf, dateText, type ClockOptions, type LessonAssetRecording, type LessonAssets,
  type LessonFileView,
} from '@ab/shared';
import { t } from '@ab/mobile-kit';

const F = t.lessonFiles;

/** A file's name: its own title, else the word of its kind. */
export const fileTitle = (file: LessonFileView): string => fileTitleOf(file, t.lessonFiles);

/** «ملف الواجب · صورة · 0.9 ميغابايت». */
export const fileLine = (file: LessonFileView): string => fileLineOf(file, t.lessonFiles);

/** «سلمى أحمد · AB-0123 · الأحد 16 نوفمبر، 7:00 م»; a group lesson lists its names. */
export function lessonHeadline(data: LessonAssets, clock: ClockOptions): string {
  const at = new Date(data.starts_at);
  const day = dateText(at, clock, { weekday: 'long', day: 'numeric', month: 'long' });
  const [only, ...more] = data.students;
  const who = more.length === 0 && only
    ? [only.name, only.code]
    : [data.students.map((s) => s.name).join('، ')];
  return [...who, `${day}، ${clockOf(at, clock)}`].filter(Boolean).join(' · ');
}

type RecordingFacts = Pick<
  LessonAssetRecording,
  'started_at' | 'ended_at' | 'duration_seconds' | 'size_bytes'
>;

/** «7:00 م – 7:42 م · المدة: 42:10 · الحجم: 19 ميغابايت»; what is not known is left out. */
export function recordingMeta(rec: RecordingFacts, clock: ClockOptions): string {
  const from = clockOf(new Date(rec.started_at), clock);
  const range = rec.ended_at ? `${from} – ${clockOf(new Date(rec.ended_at), clock)}` : from;
  const seconds = rec.duration_seconds;
  const bytes = rec.size_bytes;
  return [
    range,
    seconds === null ? null : F.duration.replace('{at}', formatClock(seconds)),
    bytes === null ? null : F.size.replace('{size}', F.sizeMb.replace('{n}', megabytes(bytes))),
  ].filter((p) => p !== null).join(' · ');
}
