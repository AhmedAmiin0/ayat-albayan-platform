import { logReportAction, type LogReportAction } from '@ab/client-core';
import type { AttendanceTableRow } from '@ab/shared';
import type { ReactNode } from 'react';
import { reportFormHref, ReportLink, RowWindow } from '@/features/reporting/reports';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';

type Row = Pick<AttendanceTableRow, 'lesson_id' | 'status' | 'starts_at' | 'report'>;
type Cell = (row: Row, href: string) => ReactNode;

/** Her sent report: «تعديل التقرير» while the window is open, then «عرض التقرير». */
const windowCell: Cell = (row, href) => row.report && <RowWindow report={row.report} href={href} />;

const CELLS: Record<LogReportAction, Cell> = {
  edit: windowCell,
  view: windowCell,
  write: (_row, href) => <ReportLink href={href}>{t.teacherBoard.writeReport}</ReportLink>,
};

export interface LogReportCellProps {
  row: Row;
  studentId: string;
}

/**
 * A log row's report (docs/47): write, edit or view it from the lesson itself; «—» on a future,
 * cancelled or moved lesson. Re-read each minute, so a lesson that starts offers «اكتب التقرير».
 */
export function LogReportCell({ row, studentId }: LogReportCellProps) {
  const now = useNow();
  const action = logReportAction(row, now);
  if (!action) return <span className="text-ink-3">—</span>;
  return CELLS[action](row, reportFormHref({ role: 'teacher', lessonId: row.lesson_id, studentId }));
}
