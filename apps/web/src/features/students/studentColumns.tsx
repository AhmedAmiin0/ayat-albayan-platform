import { studentStatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import { hamishClass, type DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { stacked } from './stacked-rows';
import { studentNote } from './student-note';
import { StudentNote } from './StudentNote';
import { StudentRowActions } from './StudentRowActions';
import { TeacherCell } from './TeacherCell';
import type { StudentListItem } from './types';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();
const quiet = (phone: string) => ({ className: `text-xs text-ink-2 ${phone}` });

/**
 * Students list columns (docs/07 §6 Data table, R-STU-01: the code is shown, never typed). The
 * hamish note folds under the name when the page is 940px or narrower.
 */
export function studentColumns(onOpen: (studentId: string) => void) {
  return col.columns([
    col.accessor('code', {
      header: () => t.students.code,
      cell: (c) => <Ltr>{c.getValue() ?? '—'}</Ltr>,
      meta: quiet(stacked.code),
    }),
    col.accessor('name', {
      header: () => t.students.name,
      cell: (c) => (
        <>
          <span className="block font-semibold">{c.getValue()}</span>
          {/* TODO(R-STU-05): «9 سنين، الرياض» sub-line once the list returns age (no city column yet). */}
          <StudentNote text={studentNote(c.row.original)} className="mt-[3px] hidden text-2xs @max-[940px]:block" />
        </>
      ),
      meta: { className: stacked.name },
    }),
    col.accessor('guardian_name', {
      header: () => t.students.guardian,
      cell: (c) => (
        <>
          <span className="block">{c.getValue()}</span>
          <span className="block text-2xs text-ink-3">
            <Ltr>{c.row.original.guardian_phone}</Ltr>
          </span>
        </>
      ),
      meta: { className: stacked.guardian },
    }),
    col.accessor('program', {
      header: () => t.students.program,
      cell: (c) => t.enums.program[c.getValue()],
      meta: quiet(stacked.program),
    }),
    col.accessor('teacher_name', {
      header: () => t.students.teacher,
      cell: (c) => <TeacherCell row={c.row.original} onOpen={onOpen} />,
      meta: quiet(stacked.teacher),
    }),
    col.accessor('status', {
      header: () => t.students.status,
      cell: (c) => <StatusChip {...studentStatusStyle[c.getValue()]} label={t.enums.studentStatus[c.getValue()]} />,
      meta: { className: stacked.status },
    }),
    col.display({
      id: 'actions',
      header: () => <span className="sr-only">{t.common.actions}</span>,
      cell: (c) => <StudentRowActions row={c.row.original} onOpen={onOpen} />,
      meta: { className: `w-[1%] ${stacked.actions}` },
    }),
    col.display({
      id: 'hamish',
      header: () => t.students.hamish,
      cell: (c) => <StudentNote text={studentNote(c.row.original)} />,
      meta: { className: hamishClass },
    }),
  ]);
}
