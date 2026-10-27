import { formatPhone, type SalesStudentView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';

const col = createColumnHelper<DataTableFeatures, SalesStudentView>();

// «كل الطلاب» (sales, read-only): who, which teacher and program, the status, the guardian's name and
// phone (owner 2026-10-27: sales see every chat with its phone). Never a balance, package, note or
// meeting link. The server pages and searches.
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
  col.accessor((s) => t.enums.studentStatus[s.status], {
    id: 'status',
    header: () => t.sales.allStudents.status,
    meta: { className: 'text-ink-2 max-sm:order-4 max-sm:text-sm' },
  }),
  col.accessor('guardian_name', {
    header: () => t.sales.allStudents.guardian,
    meta: { className: 'text-xs text-ink-3 max-sm:order-5 max-sm:basis-full' },
  }),
  col.accessor('guardian_phone', {
    header: () => t.sales.allStudents.guardianPhone,
    cell: (c) => {
      const phone = c.getValue();
      return phone ? <Ltr className="tabular-nums text-ink-2">{formatPhone(phone)}</Ltr> : null;
    },
    meta: { className: 'text-sm max-sm:order-6 max-sm:basis-full' },
  }),
]);
