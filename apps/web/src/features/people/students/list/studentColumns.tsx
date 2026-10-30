import { formatPhone, studentStatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import { hamishMeta, type DataTableFeatures } from '@/components/data-table/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { pickColumn } from '@/features/people/assistants/students/pick-column';
import type { PickColumn } from '@/features/people/assistants/students/use-student-pick';
import { t } from '@/lib/i18n/i18n';
import { stacked } from './stacked-rows';
import { studentNote } from '../profile/student-note';
import { StudentNote } from '../profile/StudentNote';
import { StudentRowActions } from './StudentRowActions';
import { TeacherCell } from './TeacherCell';
import type { StudentListItem } from '../types';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();
const quiet = (phone: string) => `text-xs text-ink-2 ${phone}`;
const text = { kind: 'text' } as const;

/**
 * Students list columns (docs/07 §6 Data table, R-STU-01: the code is shown, never typed). Every
 * data column sorts server-side (`sortKey`, R-NFR-08); code, name and guardian have a column
 * filter, program / teacher / status are filtered by StudentFilterBar above the table. The
 * hamish note folds under the name when the page is 940px or narrower. The name is a button: the
 * keyboard / screen-reader path to the profile at every width (the row click is for pointers).
 */
export function studentColumns(onOpen: (studentId: string) => void, pick?: PickColumn) {
  return col.columns([
    ...(pick ? [pickColumn(pick)] : []),
    col.accessor('code', {
      header: () => t.students.code,
      cell: (c) => <Ltr>{c.getValue() ?? '—'}</Ltr>,
      meta: { className: quiet(stacked.code), sortKey: 'code', filter: text },
    }),
    col.accessor('name', {
      header: () => t.students.name,
      cell: (c) => (
        <>
          <button
            type="button"
            className="block cursor-pointer text-start font-semibold text-ink hover:underline max-sm:min-h-11"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(c.row.original.id);
            }}
          >
            {c.getValue()}
          </button>
          {/* TODO(R-STU-05): «9 سنين، الرياض» sub-line once the list returns age (no city column yet). */}
          <StudentNote text={studentNote(c.row.original)} className="mt-[3px] hidden text-2xs @max-[940px]:block" />
        </>
      ),
      meta: { className: stacked.name, sortKey: 'name', filter: text },
    }),
    col.accessor('guardian_name', {
      header: () => t.students.guardian,
      cell: (c) => (
        <>
          <span className="block">{c.getValue()}</span>
          <span className="block text-2xs text-ink-3">
            <Ltr>{formatPhone(c.row.original.guardian_phone)}</Ltr>
          </span>
        </>
      ),
      meta: { className: stacked.guardian, sortKey: 'guardian', filter: text, filterKey: 'guardian' },
    }),
    col.accessor('program', {
      header: () => t.students.program,
      cell: (c) => t.enums.program[c.getValue()],
      meta: { className: quiet(stacked.program), sortKey: 'program' },
    }),
    col.accessor('teacher_name', {
      header: () => t.students.teacher,
      cell: (c) => <TeacherCell row={c.row.original} onOpen={onOpen} />,
      meta: { className: quiet(stacked.teacher), sortKey: 'teacher' },
    }),
    col.accessor('status', {
      header: () => t.students.status,
      cell: (c) => <StatusChip {...studentStatusStyle[c.getValue()]} label={t.enums.studentStatus[c.getValue()]} />,
      meta: { className: stacked.status, sortKey: 'status' },
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
      meta: hamishMeta,
    }),
  ]);
}
