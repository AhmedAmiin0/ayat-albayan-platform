import { studentStatusStyle } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import type { StudentListItem } from '@/features/students/types';
import { t } from '@/lib/i18n';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();
const s = t.students;

/** «3 حلقة متبقية», or «بدون باقة» without one. */
export const remainingLabel = (n: number | null | undefined): string =>
  n === null || n === undefined ? s.noPackage : s.remainingN.replace('{n}', String(n));

/** One teacher's students (R-TCH-03): code, name (→ profile), status, package left, weekly lesson. */
export const teacherStudentColumns = col.columns([
  col.accessor('code', {
    header: () => s.code,
    cell: (c) => <Ltr>{c.getValue() ?? '—'}</Ltr>,
    meta: { className: 'text-xs text-ink-2' },
  }),
  col.accessor('name', {
    header: () => s.name,
    cell: (c) => (
      <Link
        to="/admin/students/$studentId"
        params={{ studentId: c.row.original.id }}
        className="font-semibold text-ink hover:underline"
      >
        {c.getValue()}
      </Link>
    ),
  }),
  col.accessor('status', {
    header: () => s.status,
    cell: (c) => <StatusChip {...studentStatusStyle[c.getValue()]} label={t.enums.studentStatus[c.getValue()]} />,
  }),
  col.accessor('package_remaining', {
    header: () => s.remaining,
    cell: (c) => <span className="tabular-nums">{remainingLabel(c.getValue())}</span>,
    meta: { className: 'text-xs text-ink-2' },
  }),
  col.accessor('has_weekly', {
    header: () => s.weekly,
    cell: (c) => (c.getValue() ? t.common.yes : t.common.no),
    meta: { className: 'text-xs text-ink-2' },
  }),
]);
