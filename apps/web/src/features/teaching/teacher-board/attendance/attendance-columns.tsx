import { lessonWhenAt, type AttendanceTableRow } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import type { Clock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { rowNote } from './attendance-text';
import { AttendanceStatus } from './AttendanceStatus';

const col = createColumnHelper<DataTableFeatures, AttendanceTableRow>();
const w = t.sales.student.log;

/** «سجل الحضور» columns: when (+ tags, cancel reason) | status | report sent. */
export function attendanceColumns(clock: Clock & { tz: string }) {
  return col.columns([
    col.accessor('starts_at', {
      header: () => w.columns.date,
      cell: (c) => {
        const note = rowNote(c.row.original);
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
    col.accessor('report_sent', {
      header: () => w.columns.report,
      cell: (c) => (
        <span className={c.getValue() ? 'text-lapis' : 'text-ink-3'}>
          {c.getValue() ? w.sent : w.notSent}
        </span>
      ),
    }),
  ]);
}
