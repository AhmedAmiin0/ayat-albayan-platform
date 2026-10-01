import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';

const col = createColumnHelper<DataTableFeatures, Teacher>();

/** Teacher list columns (R-TCH-01). `onEdit` opens the dialog without following the row link. */
export function teacherColumns(onEdit: (teacher: Teacher) => void) {
  return col.columns([
    col.accessor('display_name_ar', { header: () => t.teachers.displayNameAr }),
    col.accessor('gender', {
      header: () => t.teachers.gender,
      cell: (c) => t.teachers.genderLabel[c.getValue()],
    }),
    col.accessor('programs', {
      header: () => t.teachers.programs,
      cell: (c) => c.getValue().map((p) => t.enums.program[p]).join(t.teachers.listSeparator),
    }),
    col.accessor('phone_e164', {
      header: () => t.teachers.phone,
      cell: (c) => <span dir="ltr">{c.getValue()}</span>,
    }),
    col.accessor('max_students', { header: () => t.teachers.maxStudents }),
    col.accessor('status', {
      header: () => t.teachers.status,
      cell: (c) => t.enums.teacherStatus[c.getValue()],
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(c.row.original);
          }}
        >
          {t.common.edit}
        </Button>
      ),
    }),
  ]);
}
