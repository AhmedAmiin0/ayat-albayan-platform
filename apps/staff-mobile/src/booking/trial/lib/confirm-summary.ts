import { formatPhone, normalizePhone } from '@ab/core';
import { teacherName } from '@ab/schedule';
import type { ViewerClock } from '@/core/lib/clock';
import { t, ltr, locale, whenText } from '@ab/mobile-kit';
import type { InvoiceDraft } from '@/booking/shared/contract';
import type { TrialDraft } from './draft';
import type { MakeupDraft } from '@/booking/makeup/makeup-draft';

export type SummaryRow = [label: string, value: string];

const durations: Record<string, string | undefined> = t.enums.duration;
const durationText = (min: number) => durations[String(min)] ?? String(min);

function invoiceLine(invoice: InvoiceDraft): string {
  return invoice.source === 'whatsapp' ? t.booking.invoice.fromChat : t.booking.mobile.invoiceUploaded;
}

/** What booking commits to, with times in Riyadh and the family's zone. */
export function summary(d: TrialDraft, viewer: ViewerClock): SummaryRow[] {
  const phone = normalizePhone(d.phone);
  const rows: SummaryRow[] = [
    [t.booking.kind.label, t.booking.kind[d.kind]],
    [t.booking.studentSection, d.studentName.trim()],
    [
      t.booking.guardianSection,
      `${d.guardianName.trim()} · ${ltr(formatPhone(phone.ok ? phone.e164 : d.phone))}`,
    ],
  ];
  if (d.teacher) rows.push([t.booking.steps.teacher, teacherName(d.teacher, locale)]);
  if (d.pkg !== 'trial') rows.push([t.booking.steps.package, t.enums.packageSize[d.pkg]]);
  if (d.startsAt) rows.push([t.booking.startsOn, whenText(d.startsAt, d.tz, viewer)]);
  rows.push([t.booking.pickDuration, durationText(d.durationMin)]);
  if (d.invoice) rows.push([t.booking.invoice.label, invoiceLine(d.invoice)]);
  return rows;
}

/** A makeup's review: type, student, missed lesson, teacher, new time, invoice. */
export function makeupSummary(d: MakeupDraft, viewer: ViewerClock): SummaryRow[] {
  const { source } = d;
  const rows: SummaryRow[] = [
    [t.booking.kind.label, t.booking.kind.makeup],
    [t.booking.studentSection, source.studentName],
    [t.booking.mobile.missedLesson, whenText(source.missedAt, source.tz, viewer)],
    [t.booking.steps.teacher, d.teacher.name],
  ];
  if (d.startsAt) rows.push([t.booking.startsOn, whenText(d.startsAt, source.tz, viewer)]);
  rows.push([t.booking.pickDuration, durationText(source.durationMin)]);
  if (d.invoice) rows.push([t.booking.invoice.label, invoiceLine(d.invoice)]);
  return rows;
}
