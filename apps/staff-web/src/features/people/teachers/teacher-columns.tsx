import { PROGRAMS, TEACHER_STATUSES } from '@ab/catalog';
import { formatPhone } from '@ab/core';
import { teacherStatusStyle } from '@ab/money';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { StudentCountLink } from './detail/StudentCountLink';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import type { Teacher, TeacherListRow } from '@ab/shared';

const col = createColumnHelper<DataTableFeatures, TeacherListRow>();

type Handlers = { onEdit: (teacher: Teacher) => void; onOpen: (teacherId: string) => void };

const text = { kind: 'text' } as const;
const programOptions = () => PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));
const statusOptions = () => TEACHER_STATUSES.map((st) => ({ value: st, label: t.enums.teacherStatus[st] }));

const NameCell = memo(function NameCell({ teacher, onOpen }: { teacher: TeacherListRow; onOpen: Handlers['onOpen'] }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={teacherLabel(teacher)} id={teacher.id} src={teacher.avatar_url} size="sm" decorative />
      <div className="grid min-w-0">
        <button
          type="button"
          className="cursor-pointer text-start font-semibold text-ink hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center max-sm:text-base"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(teacher.id);
          }}
        >
          {teacher.display_name_ar}
        </button>
        <span className="text-2xs text-ink-3">{t.teachers.genderLabel[teacher.gender]}</span>
      </div>
    </div>
  );
});

/** Every data column sorts server-side (R-TCH-01, R-NFR-08); the counts are not sortable. */
export function teacherColumns({ onEdit, onOpen }: Handlers) {
  return col.columns([
    col.accessor('display_name_ar', {
      header: () => t.teachers.displayNameAr,
      cell: (c) => <NameCell teacher={c.row.original} onOpen={onOpen} />,
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
