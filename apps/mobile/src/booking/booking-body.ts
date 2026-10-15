import { normalizePhone, registrationStatus } from '@ab/shared';
import type { BookingBody, InvoiceDraft, InvoiceInput } from './contract';
import type { StudentChoice, TrialDraft } from './draft';
import { effectiveByday } from './package-choice';
import { ruleFromSlot } from './slots';

export interface BodyOptions {
  /** Idempotency key, the same on every retry of this wizard (rule 8). */
  requestId: string;
  choice?: StudentChoice;
}

/** The invoice as the API takes it: the signed path of the upload, or the chat message to copy. */
export function toInvoiceInput(invoice: InvoiceDraft): InvoiceInput {
  return invoice.source === 'upload'
    ? { source: 'upload', path: invoice.path }
    : { source: 'whatsapp', messageId: invoice.messageId };
}

/**
 * POST /booking: a trial is one lesson, a rule on the slot's local day that ends on it (invariant
 * 4); a paid package repeats weekly from the slot on its days, with its invoice (a trial has none).
 * The new child starts trial with a trial lesson, else new (registrationStatus, docs/18 row 1: only a
 * positive payment makes it active), and carries the form's age and gender; the guardian its
 * «عرفت عننا منين؟». Unanswered optional questions are left out.
 */
export function toBookingRequest(d: TrialDraft, o: BodyOptions): BookingBody | null {
  const phone = normalizePhone(d.phone);
  if (!d.teacher || !d.startsAt || !phone.ok) return null;
  const rule = ruleFromSlot(d.startsAt, d.tz);
  const base = {
    kind: d.kind,
    teacherId: d.teacher.id,
    byday: effectiveByday(d),
    startTimeLocal: rule.startTimeLocal,
    tz: d.tz,
    durationMin: d.durationMin,
    startsOn: rule.startsOn,
    package: d.pkg,
    clientRequestId: o.requestId,
    startsAt: d.startsAt,
    leadId: d.leadId,
    // The API answers 400 invoice_required when a package arrives without one.
    ...(d.kind !== 'trial' && d.invoice ? { invoice: toInvoiceInput(d.invoice) } : {}),
  };
  if (o.choice && 'existingId' in o.choice) return { ...base, studentIds: [o.choice.existingId] };
  return {
    ...base,
    newStudent: newStudent(d),
    guardian: {
      name: d.guardianName.trim(),
      phone_e164: phone.e164,
      tz: d.tz,
      country: phone.country,
      ...(d.source ? { source: d.source } : {}),
    },
    ...(o.choice ? { force: true } : {}),
  };
}

function newStudent(d: TrialDraft) {
  return {
    name: d.studentName.trim(),
    ...(d.age.trim() ? { age: Number(d.age.trim()) } : {}),
    ...(d.studentGender ? { gender: d.studentGender } : {}),
    program: d.program,
    tz: d.tz,
    status: registrationStatus(d.pkg === 'trial'),
    teacher_gender_pref: d.gender,
  };
}
