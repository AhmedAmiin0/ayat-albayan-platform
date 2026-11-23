import { fileLineOf, fileTitleOf, megabytes } from '@ab/client-core';
import type { LessonAssetRecording, PortalLessonFile } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';

const F = t.lessonFiles;

/** A file's name: its own title, else the word of its kind («ملف الواجب»). */
export const fileTitle = (file: PortalLessonFile): string => fileTitleOf(file, F);

/** «ملف الواجب · صورة · 0.8 ميغابايت». */
export const fileLine = (file: PortalLessonFile): string => fileLineOf(file, F);

/** «44 دقيقة · 21 ميغابايت» of a recording; parts it does not know are left out. */
export function recordingLine(
  rec: Pick<LessonAssetRecording, 'duration_seconds' | 'size_bytes'>,
): string {
  const seconds = rec.duration_seconds;
  const minutes = seconds === null ? null : String(Math.round(seconds / 60));
  const parts = [
    minutes && t.audioPlayer.audio.replace('{minutes}', minutes),
    rec.size_bytes === null ? null : F.sizeMb.replace('{n}', megabytes(rec.size_bytes)),
  ];
  return parts.filter((p) => p !== null).join(' · ');
}
