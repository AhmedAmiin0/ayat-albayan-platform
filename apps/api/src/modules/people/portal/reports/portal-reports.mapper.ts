import type { PortalReport } from '@ab/shared';
import type { PortalRecordingRow, PortalReportRow } from './portal-reports.repo';

/** The newest visible recording per lesson (rows come newest first). */
export function recordingByLesson(rows: readonly PortalRecordingRow[]): Map<string, string> {
  const byLesson = new Map<string, string>();
  for (const r of rows) if (!byLesson.has(r.lesson_id)) byLesson.set(r.lesson_id, r.id);
  return byLesson;
}

/** Whitelist: when, by whom (display names), and whether a recording may be opened. */
export function toPortalReport(row: PortalReportRow, recordings: ReadonlyMap<string, string>): PortalReport {
  const teacher = row.lesson?.teacher;
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    lesson_starts_at: row.lesson?.starts_at ?? null,
    sent_at: row.sent_at ?? '',
    teacher: teacher ? { display_name_ar: teacher.display_name_ar, display_name_en: teacher.display_name_en } : null,
    recording_id: recordings.get(row.lesson_id) ?? null,
  };
}
