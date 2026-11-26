import {
  lessonFileKindSchema,
  lessonFileMediaOf,
  portalLessonFileSchema,
  type LessonAssetRecording,
  type LessonFileView,
  type PortalLessonFile,
} from '@ab/shared';
import {
  durationSeconds,
  mediaOfPath,
  STUDENT_RECORDING_STATUSES,
  type StudentRecordingStatus,
} from '@ab/schedule';
import { uploadName } from '@/common/storage/storage.paths';
import type { AssetRecordingRow, AssetReportRow, AssetStudent } from './lesson-assets.repo';
import type { LessonFileRow } from './lesson-files.repo';

/** report-attachments/{lesson_id}/{uuid}.{ext}: one object per upload, never overwritten. */
export const lessonFileKey = (input: { lessonId: string; mime: string }): string =>
  `${input.lessonId}/${uploadName(input.mime)}`;

const fileKindSchema = lessonFileKindSchema.catch('material');

/** A row as staff see it: no storage path, the media read from the mime. */
export function lessonFileView(row: LessonFileRow): LessonFileView {
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    kind: fileKindSchema.parse(row.kind),
    title: row.title,
    mime: row.mime,
    size: row.size,
    media: lessonFileMediaOf(row.mime),
    visible_to_family: row.visible_to_family,
    created_at: row.created_at,
  };
}

/** The family's whitelist of a visible file. */
export function portalLessonFile(row: LessonFileRow): PortalLessonFile {
  return portalLessonFileSchema.parse(lessonFileView(row));
}

const asStatus = (s: string): StudentRecordingStatus =>
  STUDENT_RECORDING_STATUSES.find((x) => x === s) ?? 'failed';

/** A lesson's recording for staff; `url` only for a finished file (the caller signs it). */
export function assetRecording(row: AssetRecordingRow, url: string | null): LessonAssetRecording {
  const status = asStatus(row.status);
  return {
    id: row.id,
    status,
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_seconds: durationSeconds(row.started_at, row.ended_at),
    size_bytes: row.size_bytes,
    media: mediaOfPath(row.file_path),
    visible_to_student: row.visible_to_student,
    url: status === 'done' ? url : null,
  };
}

/** A student's report of the lesson, named by the student who attended. */
export function assetReport(row: AssetReportRow, students: readonly AssetStudent[]) {
  return {
    id: row.id,
    student_name: students.find((s) => s.id === row.student_id)?.name ?? '',
    pdf_ready: row.pdf_status === 'ready',
    sent_at: row.sent_at,
  };
}
