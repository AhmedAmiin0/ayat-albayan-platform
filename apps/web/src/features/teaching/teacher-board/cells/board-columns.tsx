import { createColumnHelper } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { t } from '@/lib/i18n/i18n';
import type { BoardRow } from '@/features/teaching/teacher-board/board-rows';
import type { FactsById } from '@/features/teaching/teacher-board/student-facts';
import { CountsCell } from './CountsCell';
import { LessonCell } from './LessonCell';
import { PhoneLabel } from './PhoneLabel';
import { ReportCell } from './ReportCell';
import { StudentCell } from './StudentCell';

const col = createColumnHelper<DataTableFeatures, BoardRow>();
const w = t.teacherBoard;

export interface BoardColumnsInput {
  /** Her zone: every date on the board. */
  tz: string;
  /** Each student's facts line (program · level · age), joined by id. */
  facts: FactsById;
}

/** A stacked cell on phones starts with its column's name. */
const labelled = (text: string, cell: ReactNode) => (
  <>
    <PhoneLabel text={text} />
    {cell}
  </>
);

const reportColumn = col.accessor((r) => r.summary.report?.status ?? '', {
  id: 'report',
  header: () => w.lastReport,
  cell: (c) => labelled(w.lastReport, <ReportCell report={c.row.original.summary.report} />),
});

const attendanceColumn = col.accessor((r) => r.rate ?? -1, {
  id: 'attendance',
  header: () => w.attendance,
  cell: (c) => labelled(w.attendance, <CountsCell row={c.row.original} />),
});

/**
 * «طلابي» columns (docs/46 C1): student (name, code, status) | last lesson (date + attendance) |
 * next lesson | last report | present / absent in the window (+ rate). Each sorts on its value.
 * The name links to the student file (docs/47), with the facts line under it (docs/48).
 */
export function boardColumns({ tz, facts }: BoardColumnsInput) {
  return col.columns([
    col.accessor((r) => r.student.name, {
      id: 'student',
      header: () => w.student,
      cell: (c) => {
        const { student } = c.row.original;
        return <StudentCell student={student} facts={facts.get(student.id)} />;
      },
      meta: { className: 'max-sm:basis-full' },
    }),
    col.accessor((r) => r.summary.last?.starts_at ?? '', {
      id: 'last',
      header: () => w.lastLesson,
      cell: (c) => {
        const { summary, student } = c.row.original;
        const cell = <LessonCell lesson={summary.last} tz={tz} studentId={student.id} />;
        return labelled(w.lastLesson, cell);
      },
    }),
    col.accessor((r) => r.summary.next?.starts_at ?? '', {
      id: 'next',
      header: () => w.nextLesson,
      cell: (c) =>
        labelled(w.nextLesson, <LessonCell lesson={c.row.original.summary.next} tz={tz} />),
    }),
    reportColumn,
    attendanceColumn,
  ]);
}
