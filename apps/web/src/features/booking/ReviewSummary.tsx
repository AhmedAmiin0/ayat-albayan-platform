import { counted, joinNames } from '@ab/shared';
import type { ReactNode } from 'react';
import { WEEK_ORDER } from '@/features/teachers/grid';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { teacherLabel } from '@/lib/teacher-label';
import { effectiveByday, type BookingDraft } from './draft';
import { PACKAGE_NOTE_CLASS, packageDaysNote } from './package-days';
import { PackagePrice } from './PackageStep';
import { pickedText } from './SlotStep';

const weekday: Record<string, string> = t.enums.weekday;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-rule py-2.5 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** The invoice row: the uploaded file's name, or «من الشات». */
function invoiceText(i: NonNullable<BookingDraft['invoice']>): string {
  return i.source === 'upload' ? i.name : t.booking.invoice.fromChat;
}

/** The review step's summary of what «احجز» creates (R-SCH-06): who, with whom, when, how often. */
export function ReviewSummary({ draft }: { draft: BookingDraft }) {
  // Saturday first, like every week in the app (docs/07 §8).
  const days = WEEK_ORDER.filter((d) => effectiveByday(draft).includes(d));
  const names = draft.students.length > 0 ? draft.students.map((s) => s.name) : [draft.newStudent?.name ?? ''];
  const students = Math.max(1, draft.students.length);
  const note = packageDaysNote(draft.pkg, days.length);
  const { kind, missed, invoice } = draft;
  return (
    <dl>
      <Row label={t.booking.kind.label}>{t.booking.kind[kind]}</Row>
      <Row label={t.schedule.students}>{joinNames(names, locale)}</Row>
      {missed && <Row label={t.booking.makeup.missedLabel}>{pickedText(missed.startsAt, draft.tz)}</Row>}
      <Row label={t.students.teacher}>{draft.teacher && teacherLabel(draft.teacher)}</Row>
      <Row label={t.booking.startsOn}>
        {draft.startsAt && t.booking.firstLesson.replace('{when}', pickedText(draft.startsAt, draft.tz))}
      </Row>
      {kind !== 'makeup' && (
        <Row label={t.booking.pickDays}>
          {days.map((d) => weekday[String(d)]).join(t.teachers.listSeparator)} ({counted(t.booking.perWeek, days.length)})
          {note && <p className={`mt-1 ${PACKAGE_NOTE_CLASS}`}>{note}</p>}
        </Row>
      )}
      <Row label={t.booking.pickDuration}>{t.enums.duration[draft.durationMin]}</Row>
      {kind !== 'makeup' && (
        <Row label={t.booking.pickPackage}>
          {t.enums.packageSize[draft.pkg]}
          {kind === 'package' && (
            <>
              {' · '}
              <PackagePrice input={{ pkg: draft.pkg, durationMin: draft.durationMin, country: draft.country, students }} />
            </>
          )}
        </Row>
      )}
      {kind !== 'trial' && <Row label={t.booking.invoice.label}>{invoice ? invoiceText(invoice) : '—'}</Row>}
    </dl>
  );
}
