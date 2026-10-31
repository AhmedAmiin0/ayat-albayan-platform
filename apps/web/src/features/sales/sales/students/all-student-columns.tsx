import { formatPhone, studentStatusStyle, type SalesStudentView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { rosterAttendanceLine, rosterPackageLine } from './roster-text';
import { RosterScheduleCell } from './RosterScheduleCell';

const col = createColumnHelper<DataTableFeatures, SalesStudentView>();

// «كل الطلاب» (sales, read-only): who, which teacher and program, the status chip, the
// guardian's name and phone (owner 2026-10-27: sales see every chat with its phone). Never a
// price, payment, note or meeting link. The server pages and searches. Every student's current
// package (size, status, lessons used / left, dates), weekly schedule and attendance count
// (owner 2026-10-30), hers or not.
export const allStudentColumns = col.columns([
  col.accessor('name', {
    header: () => t.sales.allStudents.student,
    cell: (c) => (
      <span className="inline-flex items-baseline gap-3">
        <span className="font-semibold">{c.getValue()}</span>
        <Ltr className="text-sm text-ink-2">{c.row.original.code}</Ltr>
      </span>
    ),
    meta: { className: 'max-sm:order-1 max-sm:basis-full' },
  }),
  col.accessor('teacher_name', {
    header: () => t.sales.allStudents.teacher,
    cell: (c) => c.getValue() ?? <span className="text-ink-3">{t.sales.allStudents.noTeacher}</span>,
    meta: { className: 'text-ink-2 max-sm:order-2 max-sm:text-sm' },
  }),
  col.accessor((s) => t.enums.program[s.program], {
    id: 'program',
    header: () => t.sales.allStudents.program,
    meta: { className: 'text-ink-2 max-sm:order-3 max-sm:text-sm' },
  }),
  col.accessor('status', {
    header: () => t.sales.allStudents.status,
    cell: (c) => (
      <StatusChip
        size="sm"
        {...studentStatusStyle[c.getValue()]}
        label={t.enums.studentStatus[c.getValue()]}
      />
    ),
    meta: { className: 'max-sm:order-4' },
  }),
  col.accessor((s) => rosterPackageLine(s) ?? '', {
    id: 'package',
    header: () => t.sales.allStudents.package,
    meta: { className: 'text-sm text-ink-2 max-sm:order-5 max-sm:basis-full' },
  }),
  col.accessor('guardian_name', {
    header: () => t.sales.allStudents.guardian,
    meta: { className: 'text-xs text-ink-3 max-sm:order-6 max-sm:basis-full' },
  }),
  col.accessor('guardian_phone', {
    header: () => t.sales.allStudents.guardianPhone,
    cell: (c) => {
      const phone = c.getValue();
      return phone ? <Ltr className="tabular-nums text-ink-2">{formatPhone(phone)}</Ltr> : null;
    },
    meta: { className: 'text-sm max-sm:order-7 max-sm:basis-full' },
  }),
  col.display({
    id: 'schedule',
    header: () => t.sales.allStudents.schedule,
    cell: (c) => <RosterScheduleCell student={c.row.original} />,
    meta: { className: 'max-sm:order-8 max-sm:basis-full' },
  }),
  col.accessor((s) => rosterAttendanceLine(s) ?? '', {
    id: 'attendance',
    header: () => t.sales.allStudents.attendance,
    meta: { className: 'text-sm text-ink-2 max-sm:order-9 max-sm:basis-full' },
  }),
]);
