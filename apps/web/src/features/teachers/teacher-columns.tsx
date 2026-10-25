import { formatPhone, PROGRAMS, TEACHER_STATUSES, teacherStatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import type { Teacher, TeacherListRow } from './api';
import { StudentCountLink } from './StudentCountLink';
import { teacherLabel } from '@/lib/i18n/teacher-label';

const col = createColumnHelper<DataTableFeatures, TeacherListRow>();

type Handlers = { onEdit: (teacher: Teacher) => void; onOpen: (teacherId: string) => void };

const text = { kind: 'text' } as const;
const programOptions = () => PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));
const statusOptions = () => TEACHER_STATUSES.map((st) => ({ value: st, label: t.enums.teacherStatus[st] }));

/**
 * Teacher list columns (R-TCH-01, docs/07 §6). The name is a button (keyboard path to the
 * profile); «تعديل» opens the dialog without following the row link. Under 640px the rows stack:
 * name + status, programs, phone, تعديل (DataTable `stacked`). Every data column sorts server-side;
 * name / phone have a search box, programs / status a select (R-NFR-08). «مشترك» / «تجريبي» (R-TCH-03,
 * owner 2026-10-12) are server counts, not sortable, each a link to the filtered students list.
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
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', sortKey: 'name', filter: text, filterKey: 'name' },
    }),
    col.accessor('programs', {
      header: () => t.teachers.programs,
      cell: (c) => c.getValue().map((p) => t.enums.program[p]).join(t.common.listSeparator),
      meta: {
        className: 'max-sm:order-3 max-sm:text-xs max-sm:text-ink-3',
        sortKey: 'programs',
        filter: { kind: 'select', options: programOptions() },
      },
    }),
    col.accessor('phone_e164', {
      header: () => t.teachers.phone,
      cell: (c) => {
        const phone = c.getValue();
        return phone && <Ltr className="text-ink-2">{formatPhone(phone)}</Ltr>;
      },
      meta: { className: 'max-sm:order-4 max-sm:text-xs', sortKey: 'phone', filter: text, filterKey: 'phone' },
    }),
    col.accessor('max_students', {
      header: () => t.teachers.maxStudents,
      cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
      meta: { className: 'max-sm:hidden', sortKey: 'max_students' },
    }),
    col.accessor('active_count', {
      header: () => t.studentLists.active,
      cell: (c) => <StudentCountLink teacher={c.row.original} kind="active" />,
      meta: { className: 'max-sm:order-4 max-sm:text-xs' },
    }),
    col.accessor('trial_count', {
      header: () => t.studentLists.trial,
      cell: (c) => <StudentCountLink teacher={c.row.original} kind="trial" />,
      meta: { className: 'max-sm:order-4 max-sm:text-xs' },
    }),
    col.accessor('status', {
      header: () => t.teachers.status,
      cell: (c) => <StatusChip {...teacherStatusStyle[c.getValue()]} label={t.enums.teacherStatus[c.getValue()]} />,
      meta: { className: 'max-sm:order-2', sortKey: 'status', filter: { kind: 'select', options: statusOptions() } },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      meta: { className: 'w-px text-end max-sm:order-5 max-sm:ms-auto', headClassName: 'text-end' },
      cell: (c) => (
        <div className="flex justify-end gap-1.5">
          <Link
            to="/admin/teachers/$teacherId/earnings"
            params={{ teacherId: c.row.original.id }}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            aria-label={`${t.earnings.open} ${teacherLabel(c.row.original)}`}
            onClick={(e) => e.stopPropagation()}
          >
            {t.earnings.open}
          </Link>
          <Button
            variant="secondary"
            size="sm"
            aria-label={`${t.common.edit} ${teacherLabel(c.row.original)}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(c.row.original);
            }}
          >
            {t.common.edit}
          </Button>
        </div>
      ),
    }),
  ]);
}
