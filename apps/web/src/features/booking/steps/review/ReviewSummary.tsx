import { counted, joinNames } from '@ab/shared';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import type { BookingDraft } from '../../draft/draft';
import { InvoiceThumb } from '../../InvoiceThumb';
import { PackagePrice } from '../package/PackageStep';
import { ReviewDays } from './ReviewDays';
import { pickedText } from '../slots/SlotStep';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-rule py-2.5 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** The invoice row: a small thumbnail (or the PDF tile) and where it came from. */
function InvoiceRow({ invoice }: { invoice: NonNullable<BookingDraft['invoice']> }) {
  return (
    <span className="flex flex-wrap items-center gap-3">
      <InvoiceThumb src={invoice.preview} mime={invoice.mime} className="h-14 min-w-14" />
      <span className="text-xs text-ink-2">
        {invoice.source === 'upload' ? invoice.name : t.booking.invoice.fromChat}
      </span>
    </span>
  );
}

/** The package row: its name and price; the assistant's course its lesson count (no price: the subscription has it). */
function PackageValue({ draft, students }: { draft: BookingDraft; students: number }) {
  if (draft.course) return <>{counted(t.schedule.lessonCount, draft.course.lessonsTotal)}</>;
  return (
    <>
      {t.enums.packageSize[draft.pkg]}
      {draft.kind === 'package' && (
        <>
          {' · '}
          <PackagePrice input={{ pkg: draft.pkg, durationMin: draft.durationMin, country: draft.country, students }} />
        </>
      )}
    </>
  );
}

/**
 * The review step's summary of what «احجز» creates (R-SCH-06): who, with whom, when, how often (each
 * day with its time). The assistant's course: its lesson count and end date, no price, no invoice.
 */
export function ReviewSummary({ draft }: { draft: BookingDraft }) {
  const names = draft.students.length > 0 ? draft.students.map((s) => s.name) : [draft.newStudent?.name ?? ''];
  const students = Math.max(1, draft.students.length);
  const { kind, missed, invoice } = draft;
  return (
    <dl>
      <Row label={t.booking.kind.label}>{t.booking.kind[kind]}</Row>
      <Row label={t.schedule.students}>{joinNames(names, locale)}</Row>
      {missed && <Row label={t.booking.makeup.missedLabel}>{pickedText(missed.startsAt, draft.tz)}</Row>}
      <Row label={t.students.teacher}>{draft.teacher && teacherLabel(draft.teacher)}</Row>
      <Row label={kind === 'makeup' ? t.booking.makeup.timeLabel : t.booking.startsOn}>
        {draft.startsAt && (kind === 'makeup' ? pickedText(draft.startsAt, draft.tz) : t.booking.firstLesson.replace('{when}', pickedText(draft.startsAt, draft.tz)))}
      </Row>
      {kind !== 'makeup' && (
        <Row label={t.booking.pickDays}>
          <ReviewDays draft={draft} />
        </Row>
      )}
      <Row label={t.booking.pickDuration}>{t.enums.duration[draft.durationMin]}</Row>
      {kind !== 'makeup' && (
        <Row label={t.booking.pickPackage}>
          <PackageValue draft={draft} students={students} />
        </Row>
      )}
      {kind !== 'trial' && !draft.course && <Row label={t.booking.invoice.label}>{invoice ? <InvoiceRow invoice={invoice} /> : '—'}</Row>}
    </dl>
  );
}
