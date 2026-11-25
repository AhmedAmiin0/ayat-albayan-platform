import { STUDENT_PACKAGE_FILTERS } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Ltr, StatusChip, t } from '@ab/web-kit';
import type { StudentListItem } from '@ab/shared';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();
const s = t.students;

export const remainingLabel = (n: number | null | undefined): string =>
  n === null || n === undefined ? s.noPackage : s.remainingN.replace('{n}', String(n));

const text = { kind: 'text' } as const;
const packageOptions = () => STUDENT_PACKAGE_FILTERS.map((p) => ({ value: p, label: s.packageFilter[p] }));
const weeklyOptions = () => [
  { value: 'yes', label: s.weeklyYes },
  { value: 'no', label: s.weeklyNo },
];

/** Every column sorts server-side (R-TCH-03, R-NFR-08). */
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
      // A bare yes/no says nothing without its head, so stacked phone rows omit it.
      className: 'text-xs text-ink-2 max-sm:hidden',
      sortKey: 'weekly',
      filter: { kind: 'select', options: weeklyOptions() },
      filterKey: 'weekly',
    },
  }),
]);
