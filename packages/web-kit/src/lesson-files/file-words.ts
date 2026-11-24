import { fileLineOf, fileTitleOf, megabytes } from '@ab/client-core';
import type { LessonAssetRecording, PortalLessonFile } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.lessonFiles;

/** A file's own title, else the word of its kind. */
export const fileTitle = (file: PortalLessonFile): string => fileTitleOf(file, F);

export const fileLine = (file: PortalLessonFile): string => fileLineOf(file, F);

/** Parts it does not know are left out. */
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
