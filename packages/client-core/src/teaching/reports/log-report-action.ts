import { reportBlock, type AttendanceTableRow } from '@ab/shared';
import { editableNow } from './send-lines';

/** What a log row offers the teacher (docs/47): edit, view, write, or nothing. */
export type LogReportAction = 'edit' | 'view' | 'write';

type LogRow = Pick<AttendanceTableRow, 'status' | 'starts_at' | 'report'>;

const canWrite = (row: LogRow, now: Date): boolean =>
  reportBlock({ lessonStatus: row.status, lessonStartsAt: new Date(row.starts_at), now }) === null;

/** Edit while the window is open, else view; write once started and not cancelled or moved. */
export function logReportAction(row: LogRow, now: Date): LogReportAction | null {
  const report = row.report;
  if (report) return editableNow(report, now) ? 'edit' : 'view';
  return canWrite(row, now) ? 'write' : null;
}
