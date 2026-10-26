import { bookingInvoiceInput } from '@ab/client-core';
import { dayTimesFromPicks, normalizePhone, registrationStatus } from '@ab/shared';
import type { BookingBody, InvoiceDraft, InvoiceInput } from '../../shared/contract';
import type { StudentChoice, TrialDraft } from './draft';
import { picksOf } from '../../shared/picks';
import { ruleFromSlot } from '../../shared/slots';

interface BodyOptions {
  /** Idempotency key, the same on every retry of this wizard (rule 8). */
  requestId: string;
  choice?: StudentChoice;
}

/** The invoice as the API takes it: the signed path of the upload, or the chat message to copy (@ab/client-core). */
export const toInvoiceInput: (invoice: InvoiceDraft) => InvoiceInput = bookingInvoiceInput;

/**
 * The rule's timing: a trial one lesson on the slot's local day (invariant 4); a package every
 * pick's weekday from the earliest pick, with `dayTimes` for the days at another time.
 */
function ruleTiming(d: TrialDraft, startsAt: string) {
  const picked = d.kind === 'package' ? dayTimesFromPicks(picksOf(d), d.tz) : null;
  if (!picked) {
    const rule = ruleFromSlot(startsAt, d.tz);
    return { byday: [rule.weekday], startTimeLocal: rule.startTimeLocal, startsOn: rule.startsOn, startsAt };
  }
  const { dayTimes, ...rest } = picked;
  return { ...rest, ...(dayTimes.length > 0 ? { dayTimes } : {}) };
}

/**
 * POST /booking: a trial is one lesson, a rule on the slot's local day that ends on it (invariant
 * 4); a paid package repeats weekly on its picks' days, with its invoice (a trial has none).
 * The new child starts trial with a trial lesson, else new (registrationStatus, docs/18 row 1: only a
 * positive payment makes it active), and carries the form's age and gender; the guardian its
 * «عرفت عننا منين؟». Unanswered optional questions are left out.
 */
export function toBookingRequest(d: TrialDraft, o: BodyOptions): BookingBody | null {
  const phone = normalizePhone(d.phone);
  if (!d.teacher || !d.startsAt || !phone.ok) return null;
  const base = {
    kind: d.kind,
    teacherId: d.teacher.id,
    // byday, startTimeLocal, startsOn, startsAt (+ dayTimes)
    ...ruleTiming(d, d.startsAt),
    tz: d.tz,
    durationMin: d.durationMin,
    package: d.pkg,
    clientRequestId: o.requestId,
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
