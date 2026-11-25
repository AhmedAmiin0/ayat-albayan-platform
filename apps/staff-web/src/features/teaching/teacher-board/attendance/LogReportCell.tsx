import { logReportAction, type LogReportAction } from '@ab/client-core';
import type { AttendanceTableRow } from '@ab/shared';
import type { ReactNode } from 'react';
import { reportFormHref, ReportLink, RowWindow } from '@/features/reporting/reports';
import { t, useNow } from '@ab/web-kit';
import { LessonDisclosure } from './LessonDisclosure';

type Row = Pick<AttendanceTableRow, 'lesson_id' | 'status' | 'starts_at' | 'report' | 'report_id'>;
type Cell = (row: Row, href: string) => ReactNode;

/** After the edit window there is no link (docs/49): the report is read in the row. */
const CELLS: Record<LogReportAction, Cell> = {
  edit: (row, href) => row.report && <RowWindow report={row.report} href={href} />,
  view: () => null,
  write: (_row, href) => <ReportLink href={href}>{t.teacherBoard.writeReport}</ReportLink>,
};

export interface LogReportCellProps {
  row: Row;
  studentId: string;
}

/** Re-read each minute so a lesson that starts offers writing the report (docs/47, docs/49). */
export function LogReportCell({ row, studentId }: LogReportCellProps) {
  const now = useNow();
  const action = logReportAction(row, now);
  const href = reportFormHref({ role: 'teacher', lessonId: row.lesson_id, studentId });
  return (
    <div className="grid justify-items-start gap-1">
      {action ? CELLS[action](row, href) : <span className="text-ink-3">—</span>}
      <LessonDisclosure row={row} studentId={studentId} />
    </div>
  );
}
