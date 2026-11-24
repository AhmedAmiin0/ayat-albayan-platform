import type { PortalRecording } from '@ab/shared';
import { durationSeconds, mediaOfPath } from '@ab/schedule';
import type { PortalRecordingRow } from '@/modules/people/portal';

/** The family's whitelist of a recording: no path or egress id; the report it came with. */
export function portalRecording(row: PortalRecordingRow, reportId: string | null): PortalRecording {
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    report_id: reportId,
    lesson_starts_at: row.lesson.starts_at,
    teacher: row.lesson.teacher,
    duration_seconds: durationSeconds(row.started_at, row.ended_at),
    size_bytes: row.size_bytes,
    media: mediaOfPath(row.file_path),
  };
}
