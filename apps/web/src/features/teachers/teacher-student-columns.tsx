import { STUDENT_PACKAGE_FILTERS, studentStatusStyle } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import type { StudentListItem } from '@/features/students/types';
import { t } from '@/lib/i18n';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();
const s = t.students;

/** «3 حلقة متبقية», or «بدون باقة» without one. */
export const remainingLabel = (n: number | null | undefined): string =>
  n === null || n === undefined ? s.noPackage : s.remainingN.replace('{n}', String(n));

const text = { kind: 'text' } as const;
const packageOptions = () => STUDENT_PACKAGE_FILTERS.map((p) => ({ value: p, label: s.packageFilter[p] }));
const weeklyOptions = () => [
  { value: 'yes', label: s.weeklyYes },
  { value: 'no', label: s.weeklyNo },
];

/**
 * One teacher's students (R-TCH-03): code, name (→ profile), status, package left, weekly lesson.
 * Every column sorts server-side (R-NFR-08); status is filtered by the chips above, package left
 * and weekly by the list's «الباقة» / «حلقة أسبوعية» filters. Phones (stacked): name + status, then
 * code and package left.
 */
export const teacherStudentColumns = col.columns([
  col.accessor('code', {
    header: () => s.code,
    cell: (c) => <Ltr>{c.getValue() ?? '—'}</Ltr>,
    meta: { className: 'text-xs text-ink-2 max-sm:order-3', sortKey: 'code', filter: text },
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
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%] max-sm:text-base', sortKey: 'name', filter: text, search: true },
  }),
  col.accessor('status', {
    header: () => s.status,
    cell: (c) => <StatusChip {...studentStatusStyle[c.getValue()]} label={t.enums.studentStatus[c.getValue()]} />,
    meta: { className: 'max-sm:order-2', sortKey: 'status' },
  }),
  col.accessor('package_remaining', {
    header: () => s.remaining,
    cell: (c) => <span className="tabular-nums">{remainingLabel(c.getValue())}</span>,
    meta: {
      className: 'text-xs text-ink-2 max-sm:order-4',
      sortKey: 'remaining',
      filter: { kind: 'select', options: packageOptions() },
      filterKey: 'package',
    },
  }),
  col.accessor('has_weekly', {
    header: () => s.weekly,
    cell: (c) => (c.getValue() ? t.common.yes : t.common.no),
    meta: {
      // A bare «نعم / لا» says nothing without its head: phones (stacked rows) leave it out.
      className: 'text-xs text-ink-2 max-sm:hidden',
      sortKey: 'weekly',
      filter: { kind: 'select', options: weeklyOptions() },
      filterKey: 'weekly',
    },
  }),
]);
