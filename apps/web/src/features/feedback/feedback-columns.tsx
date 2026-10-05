import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures, FilterOption } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { feedbackDate } from './format';
import { kindOptions, quickRatingOptions, ratingOptions, recommendOptions } from './filter-options';
import type { FeedbackListRow } from './types';

const col = createColumnHelper<DataTableFeatures, FeedbackListRow>();

// Server sort/filter (R-NFR-08): `sortKey` / filter keys are the GET /feedback params. The student
// has no sort (lesson_feedback has no FK to students); it filters by name or code.

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
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_100%]', filter: { kind: 'text' } },
  });

/** The teacher filter's options are the teachers list (ids; the API filters `teacher=<id>`). */
const teacherColumn = (teachers: FilterOption[]) =>
  col.accessor((r) => r.teacher?.name ?? '', {
    id: 'teacher',
    header: () => t.feedback.teacher,
    meta: {
      className: 'max-sm:order-4 max-sm:text-xs max-sm:text-ink-2',
      sortKey: 'teacher',
      filter: { kind: 'select', options: teachers },
    },
  });

const kind = col.accessor('kind', {
  header: () => t.feedback.kind,
  cell: (c) => t.enums.feedbackKind[c.getValue()],
  meta: { className: 'max-sm:order-3 max-sm:text-xs max-sm:text-ink-2', sortKey: 'kind', filter: { kind: 'select', options: kindOptions() } },
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
  meta: { className: 'max-sm:order-2', sortKey: 'rating', filter: { kind: 'select', options: ratingOptions() } },
});

/** The guardian's WhatsApp button answer (lesson_rating, migration 195); «—» before any tap. */
const quickRating = col.accessor((r) => r.quick_rating ?? null, {
  id: 'quick_rating',
  header: () => t.feedback.quickRatingCol,
  cell: (c) => {
    const v = c.getValue();
    return v ? <StatusChip tone={v === 'needs_work' ? 'act' : 'ok'} glyph="fill" size="sm" label={t.feedback.quickRating[v]} /> : <span className="max-sm:hidden">—</span>;
  },
  meta: { className: 'max-sm:order-2', sortKey: 'quick_rating', filter: { kind: 'select', options: quickRatingOptions() } },
});

/** The column says «الترشيح»; the filter row spells the same short label. */
const recommend = col.accessor('recommend', {
  header: () => t.feedback.recommendShort,
  cell: (c) => (c.getValue() ? t.enums.feedbackRecommend[c.getValue() ?? 'maybe'] : <span className="max-sm:hidden">—</span>),
  meta: { className: 'max-sm:order-2 max-sm:font-semibold', sortKey: 'recommend', filter: { kind: 'select', options: recommendOptions() } },
});

const note = col.accessor('note', {
  header: () => t.feedback.note,
  cell: (c) => <span className="text-xs text-ink-2">{c.getValue() ?? ''}</span>,
  meta: {
    className: 'min-w-40 max-w-72 whitespace-normal max-sm:order-5 max-sm:max-w-none max-sm:basis-full',
    sortKey: 'note',
    filter: { kind: 'text' },
  },
});

/** The admin's columns (teacher included, its filter over `teachers`), or a teacher's own. */
export function feedbackColumns(opts: { showTeacher: boolean; teachers: FilterOption[] }) {
  return opts.showTeacher
    ? col.columns([studentColumn(true), teacherColumn(opts.teachers), kind, quickRating, rating, recommend, note])
    : col.columns([studentColumn(false), kind, quickRating, rating, recommend, note]);
}
