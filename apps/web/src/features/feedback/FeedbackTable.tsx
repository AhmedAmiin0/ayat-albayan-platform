import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, type DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { formatDate } from '@/features/leads/format';
import { t } from '@/lib/i18n';
import type { FeedbackListRow } from './types';

const col = createColumnHelper<DataTableFeatures, FeedbackListRow>();

const pending = <span className="text-ink-3">{t.feedback.pending}</span>;

const student = col.accessor((r) => r.student.name, {
  id: 'student',
  header: () => t.feedback.student,
  cell: (c) => (
    <span className="font-semibold text-ink">
      {c.getValue()} {c.row.original.student.code && <Ltr className="text-xs font-normal text-ink-3">{c.row.original.student.code}</Ltr>}
    </span>
  ),
  meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]' },
});

const teacher = col.accessor((r) => r.teacher?.name ?? '', {
  id: 'teacher',
  header: () => t.feedback.teacher,
  meta: { className: 'max-sm:order-2' },
});

/** «رقم واتساب للتواصل»: for the academy to call back; the teacher's own list never has it. */
const contact = col.accessor((r) => r.contact_phone ?? '', {
  id: 'contact',
  header: () => t.feedback.contact,
  cell: (c) => (c.getValue() ? <Ltr className="text-xs text-ink-2">{c.getValue()}</Ltr> : '—'),
  meta: { className: 'max-sm:order-3' },
});

const rest = [
  col.accessor('kind', {
    header: () => t.feedback.kind,
    cell: (c) => t.enums.feedbackKind[c.getValue()],
    meta: { className: 'max-sm:order-3' },
  }),
  col.accessor('rating', {
    header: () => t.feedback.rating,
    cell: (c) => (c.getValue() === null ? pending : <span className="font-semibold tabular-nums">{t.feedback.outOf.replace('{n}', String(c.getValue()))}</span>),
    meta: { className: 'max-sm:order-4' },
  }),
  col.accessor('recommend', {
    header: () => t.feedback.recommend,
    cell: (c) => (c.getValue() ? t.enums.feedbackRecommend[c.getValue() ?? 'maybe'] : '—'),
    meta: { className: 'max-sm:order-5' },
  }),
  col.accessor('note', {
    header: () => t.feedback.note,
    cell: (c) => <span className="text-xs text-ink-2">{c.getValue() ?? ''}</span>,
    meta: { className: 'max-sm:order-7 max-sm:basis-full' },
  }),
  col.accessor((r) => r.submitted_at ?? r.requested_at, {
    id: 'date',
    header: () => t.feedback.date,
    cell: (c) => <span className="text-xs text-ink-3">{formatDate(c.getValue())}</span>,
    meta: { className: 'max-sm:order-6' },
  }),
];

const WITH_TEACHER = col.columns([student, teacher, contact, ...rest]);
const WITHOUT_TEACHER = col.columns([student, ...rest]);

/** The feedback rows: the admin sees the teacher column, a teacher's own list does not need it. */
export function FeedbackTable({ rows, showTeacher }: { rows: FeedbackListRow[]; showTeacher: boolean }) {
  return (
    <DataTable
      stacked
      columns={showTeacher ? WITH_TEACHER : WITHOUT_TEACHER}
      data={rows}
      getRowId={(r) => r.id}
      emptyText={t.feedback.empty}
    />
  );
}
