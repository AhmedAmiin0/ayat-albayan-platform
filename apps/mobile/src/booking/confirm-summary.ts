import { formatPhone, normalizePhone, teacherName } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import type { InvoiceDraft } from './contract';
import type { TrialDraft } from './draft';
import type { MakeupDraft } from './makeup-draft';
import { whenText } from './slots';
import { locale } from '@/lib/locale';

export type SummaryRow = [label: string, value: string];

const durations: Record<string, string | undefined> = t.enums.duration;
const durationText = (min: number) => durations[String(min)] ?? String(min);

/** «من الشات» or «اترفعت من الجهاز»: where the invoice came from. */
export function invoiceLine(invoice: InvoiceDraft): string {
  return invoice.source === 'whatsapp' ? t.booking.invoice.fromChat : t.booking.mobile.invoiceUploaded;
}

/** The lines «احجز» commits to: the type, who, which parent number, with whom, when (Riyadh + family). */
export function summary(d: TrialDraft): SummaryRow[] {
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
  if (d.startsAt) rows.push([t.booking.startsOn, whenText(d.startsAt, d.tz)]);
  rows.push([t.booking.pickDuration, durationText(d.durationMin)]);
  if (d.invoice) rows.push([t.booking.invoice.label, invoiceLine(d.invoice)]);
  return rows;
}

/** A makeup's review: the type, the student, the missed lesson, the teacher, the new time, the invoice. */
export function makeupSummary(d: MakeupDraft): SummaryRow[] {
  const { source } = d;
  const rows: SummaryRow[] = [
    [t.booking.kind.label, t.booking.kind.makeup],
    [t.booking.studentSection, source.studentName],
    [t.booking.mobile.missedLesson, whenText(source.missedAt, source.tz)],
    [t.booking.steps.teacher, d.teacher.name],
  ];
  if (d.startsAt) rows.push([t.booking.startsOn, whenText(d.startsAt, source.tz)]);
  rows.push([t.booking.pickDuration, durationText(source.durationMin)]);
  if (d.invoice) rows.push([t.booking.invoice.label, invoiceLine(d.invoice)]);
  return rows;
}
