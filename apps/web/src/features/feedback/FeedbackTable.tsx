import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, type DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { feedbackDate } from './format';
import type { FeedbackListRow } from './types';

const col = createColumnHelper<DataTableFeatures, FeedbackListRow>();

/**
 * Name and code on the first line; the admin's list folds the family's number («رقم واتساب للتواصل»)
 * under them. A teacher's own list never shows it (the API does not send it, and this never reads it).
 */
const studentColumn = (withPhone: boolean) =>
  col.accessor((r) => r.student.name, {
    id: 'student',
    header: () => t.feedback.student,
    cell: (c) => {
      const { student: s, contact_phone: phone } = c.row.original;
      return (
        <span className="grid gap-0.5">
          <span className="font-semibold text-ink">
            {c.getValue()} {s.code && <Ltr className="text-xs font-normal text-ink-3">{s.code}</Ltr>}
          </span>
          {withPhone && phone && <Ltr className="text-xs text-ink-2">{phone}</Ltr>}
        </span>
      );
    },
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_100%]' },
  });

const teacher = col.accessor((r) => r.teacher?.name ?? '', {
  id: 'teacher',
  header: () => t.feedback.teacher,
  meta: { className: 'max-sm:order-4 max-sm:text-xs max-sm:text-ink-2' },
});

const kind = col.accessor('kind', {
  header: () => t.feedback.kind,
  cell: (c) => t.enums.feedbackKind[c.getValue()],
  meta: { className: 'max-sm:order-3 max-sm:text-xs max-sm:text-ink-2' },
});

/** The answer, or the waiting chip (hollow nuqta); the date it was answered (or asked) under it. */
const rating = col.accessor('rating', {
  header: () => t.feedback.rating,
  cell: (c) => {
    const r = c.row.original;
    return (
      <span className="grid gap-0.5">
        {r.rating === null ? (
          <StatusChip tone="neutral" glyph="hollow" size="sm" label={t.feedback.pending} />
        ) : (
          <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
            <NuqtaGlyph shape="fill" className="text-ok" />
            {t.feedback.outOf.replace('{n}', String(r.rating))}
          </span>
        )}
        <span className="text-xs text-ink-3">{feedbackDate(r.submitted_at ?? r.requested_at)}</span>
      </span>
    );
  },
  meta: { className: 'max-sm:order-2' },
});

/** The guardian's WhatsApp button answer (lesson_rating, migration 195); «—» before any tap. */
const quickRating = col.accessor((r) => r.quick_rating ?? null, {
  id: 'quick_rating',
  header: () => t.feedback.quickRatingCol,
  cell: (c) => {
    const v = c.getValue();
    return v ? <StatusChip tone={v === 'needs_work' ? 'act' : 'ok'} glyph="fill" size="sm" label={t.feedback.quickRating[v]} /> : <span className="max-sm:hidden">—</span>;
  },
  meta: { className: 'max-sm:order-2' },
});

/** The long question is the header's title; the column says «الترشيح». */
const recommend = col.accessor('recommend', {
  header: () => <span title={t.feedback.recommend}>{t.feedback.recommendShort}</span>,
  cell: (c) => (c.getValue() ? t.enums.feedbackRecommend[c.getValue() ?? 'maybe'] : <span className="max-sm:hidden">—</span>),
  meta: { className: 'max-sm:order-2 max-sm:font-semibold' },
});

const note = col.accessor('note', {
  header: () => t.feedback.note,
  cell: (c) => <span className="text-xs text-ink-2">{c.getValue() ?? ''}</span>,
  meta: { className: 'min-w-40 max-w-72 whitespace-normal max-sm:order-5 max-sm:max-w-none max-sm:basis-full' },
});

const WITH_TEACHER = col.columns([studentColumn(true), teacher, kind, quickRating, rating, recommend, note]);
const WITHOUT_TEACHER = col.columns([studentColumn(false), kind, quickRating, rating, recommend, note]);

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
