import { lessonWhenAt, type AttendanceTableRow } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { t } from '@/lib/i18n/i18n';
import { rowNote, type NoteClock } from './attendance-text';
import { AttendanceStatus } from './AttendanceStatus';
import { LogReportCell } from './LogReportCell';

const col = createColumnHelper<DataTableFeatures, AttendanceTableRow>();
const w = t.sales.student.log;

export interface AttendanceColumnsOptions {
  /** Her clock and zone: every time on the row reads in it. */
  clock: NoteClock;
  /** The student of the log (the report links). */
  studentId: string;
}

/** «سجل الحضور» columns: when (+ tags, reasons, move lines) | status | report (docs/47). */
export function attendanceColumns({ clock, studentId }: AttendanceColumnsOptions) {
  return col.columns([
    col.accessor('starts_at', {
      header: () => w.columns.date,
      cell: (c) => {
        const note = rowNote(c.row.original, clock);
        return (
          <span className="grid gap-0.5">
            <span className="tabular-nums">{lessonWhenAt(new Date(c.getValue()), clock)}</span>
            {note && <span className="text-xs whitespace-normal text-ink-3">{note}</span>}
          </span>
        );
      },
    }),
    col.accessor('kind', {
      header: () => w.columns.status,
      cell: (c) => <AttendanceStatus row={c.row.original} />,
    }),
    col.display({
      id: 'report',
      header: () => w.columns.report,
      cell: (c) => <LogReportCell row={c.row.original} studentId={studentId} />,
    }),
  ]);
}
