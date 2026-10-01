import { formatPhone, teacherStatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';

const col = createColumnHelper<DataTableFeatures, Teacher>();

type Handlers = { onEdit: (teacher: Teacher) => void; onOpen: (teacherId: string) => void };

/**
 * Teacher list columns (R-TCH-01, docs/07 §6). The name is a button (keyboard path to the
 * profile); «تعديل» opens the dialog without following the row link. Under 640px the rows stack:
 * name + status, programs, phone, تعديل (DataTable `stacked`).
 * TODO(R-TCH-03): students-per-teacher count beside the max once the list API returns it.
 */
export function teacherColumns({ onEdit, onOpen }: Handlers) {
  return col.columns([
    col.accessor('display_name_ar', {
      header: () => t.teachers.displayNameAr,
      cell: (c) => (
        <div className="grid">
          <button
            type="button"
            className="cursor-pointer text-start font-semibold text-ink hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center max-sm:text-base"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(c.row.original.id);
            }}
          >
            {c.getValue()}
          </button>
          <span className="text-2xs text-ink-3">{t.teachers.genderLabel[c.row.original.gender]}</span>
        </div>
      ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]' },
    }),
    col.accessor('programs', {
      header: () => t.teachers.programs,
      cell: (c) => c.getValue().map((p) => t.enums.program[p]).join(t.teachers.listSeparator),
      meta: { className: 'max-sm:order-3 max-sm:text-xs max-sm:text-ink-3' },
    }),
    col.accessor('phone_e164', {
      header: () => t.teachers.phone,
      cell: (c) => {
        const phone = c.getValue();
        return phone && <Ltr className="text-ink-2">{formatPhone(phone)}</Ltr>;
      },
      meta: { className: 'max-sm:order-4 max-sm:text-xs' },
    }),
    col.accessor('max_students', {
      header: () => t.teachers.maxStudents,
      cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
      meta: { className: 'max-sm:hidden' },
    }),
    col.accessor('status', {
      header: () => t.teachers.status,
      cell: (c) => <StatusChip {...teacherStatusStyle[c.getValue()]} label={t.enums.teacherStatus[c.getValue()]} />,
      meta: { className: 'max-sm:order-2' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      meta: { className: 'w-px text-end max-sm:order-5 max-sm:ms-auto', headClassName: 'text-end' },
      cell: (c) => (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`${t.common.edit} ${c.row.original.display_name_ar}`}
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
