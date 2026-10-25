import { STUDENT_STATUSES, studentStatusStyle, type TeacherMe } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnFilterDef, DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n';

type MyStudent = TeacherMe['students'][number];

const col = createColumnHelper<DataTableFeatures, MyStudent>();
const text: ColumnFilterDef = { kind: 'text' };
const statuses: ColumnFilterDef = {
  kind: 'select',
  options: STUDENT_STATUSES.map((s) => ({ value: s, label: t.enums.studentStatus[s] })),
};

const nameColumn = col.accessor('name', {
  header: () => t.students.name,
  cell: (c) => (
    <Link
      to="/teacher/reports/$studentId"
      params={{ studentId: c.row.original.id }}
      title={t.reports.history}
      className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4"
    >
      {c.getValue()}
    </Link>
  ),
  meta: { filter: text },
});

const codeColumn = col.accessor('code', {
  header: () => t.students.code,
  cell: (c) => <Ltr className="text-ink-2">{c.getValue()}</Ltr>,
  meta: { filter: text },
});

// The value is the city shown, so it sorts and filters by what the row says.
const tzColumn = col.accessor((s) => tzCity(s.tz) ?? s.tz, {
  id: 'tz',
  header: () => t.students.tz,
  cell: (c) => (tzCity(c.row.original.tz) ? c.getValue() : <Ltr>{c.getValue()}</Ltr>),
  meta: { className: 'text-ink-2 max-sm:hidden', headClassName: 'max-sm:hidden', filter: text },
});

const statusColumn = col.accessor('status', {
  header: () => t.students.status,
  cell: (c) => <StatusChip size="sm" {...studentStatusStyle[c.getValue()]} label={t.enums.studentStatus[c.getValue()]} />,
  meta: { filter: statuses },
});

/** «طلابي» columns: name (→ report history), code, tz city, and the account status when shown. */
export const myStudentColumns = (showStatus: boolean) =>
  showStatus ? col.columns([nameColumn, codeColumn, tzColumn, statusColumn]) : col.columns([nameColumn, codeColumn, tzColumn]);
