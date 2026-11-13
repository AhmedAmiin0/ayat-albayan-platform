import { reportBlock, type AttendanceTableRow } from '@ab/shared';
import { editableNow } from './send-lines.js';

/** What a log row offers the teacher (docs/47): edit, view, write, or nothing. */
export type LogReportAction = 'edit' | 'view' | 'write';

type LogRow = Pick<AttendanceTableRow, 'status' | 'starts_at' | 'report'>;

const canWrite = (row: LogRow, now: Date): boolean =>
  reportBlock({ lessonStatus: row.status, lessonStartsAt: new Date(row.starts_at), now }) === null;

/**
 * A row with her report: «تعديل التقرير» while the window is open on this clock, else
 * «عرض التقرير». No report: «اكتب التقرير» once the lesson started and is not cancelled or
 * moved; a future, cancelled or moved row offers nothing.
 */
export function logReportAction(row: LogRow, now: Date): LogReportAction | null {
  const report = row.report;
  if (report) return editableNow(report, now) ? 'edit' : 'view';
  return canWrite(row, now) ? 'write' : null;
}
