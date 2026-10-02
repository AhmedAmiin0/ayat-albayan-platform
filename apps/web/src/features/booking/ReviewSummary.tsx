import { counted, joinNames } from '@ab/shared';
import type { ReactNode } from 'react';
import { WEEK_ORDER } from '@/features/teachers/grid';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
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

/** The review step's summary of what «احجز» creates (R-SCH-06): who, with whom, when, how often. */
export function ReviewSummary({ draft }: { draft: BookingDraft }) {
  // Saturday first, like every week in the app (docs/07 §8).
  const days = WEEK_ORDER.filter((d) => effectiveByday(draft).includes(d));
  const names = draft.students.length > 0 ? draft.students.map((s) => s.name) : [draft.newStudent?.name ?? ''];
  const students = Math.max(1, draft.students.length);
  const note = packageDaysNote(draft.pkg, days.length);
  return (
    <dl>
      <Row label={t.schedule.students}>{joinNames(names, locale)}</Row>
      <Row label={t.schedule.teacher}>{draft.teacher?.display_name_ar}</Row>
      <Row label={t.schedule.time}>
        {draft.startsAt && t.booking.firstLesson.replace('{when}', pickedText(draft.startsAt, draft.tz))}
      </Row>
      <Row label={t.booking.pickDays}>
        {days.map((d) => weekday[String(d)]).join(t.teachers.listSeparator)} ({counted(t.booking.perWeek, days.length)})
        {note && <p className={`mt-1 ${PACKAGE_NOTE_CLASS}`}>{note}</p>}
      </Row>
      <Row label={t.schedule.duration}>{t.enums.duration[draft.durationMin]}</Row>
      <Row label={t.booking.pickPackage}>
        {t.enums.packageSize[draft.pkg]} ·{' '}
        <PackagePrice input={{ pkg: draft.pkg, durationMin: draft.durationMin, country: draft.country, students }} />
      </Row>
    </dl>
  );
}
