import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import type { StudentListItem } from './types';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();

/** Students list columns (R-STU-01: the code is shown, never typed). */
export const studentColumns = col.columns([
  col.accessor('code', { header: () => t.students.code }),
  col.accessor('name', { header: () => t.students.name }),
  col.accessor('guardian_name', { header: () => t.students.guardian }),
  col.accessor('guardian_phone', {
    header: () => t.students.guardianPhone,
    cell: (c) => <span dir="ltr">{c.getValue()}</span>,
  }),
  col.accessor('program', { header: () => t.students.program, cell: (c) => t.enums.program[c.getValue()] }),
  col.accessor('status', { header: () => t.students.status, cell: (c) => t.enums.studentStatus[c.getValue()] }),
  col.accessor('teacher_name', {
    header: () => t.students.teacher,
    cell: (c) => c.getValue() ?? t.students.noTeacher,
  }),
]);
