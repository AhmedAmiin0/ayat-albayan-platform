import { normalizePhone, type BookingRequest } from '@ab/shared';
import type { StudentChoice, TrialDraft } from './draft';
import { effectiveByday } from './package-choice';
import { ruleFromSlot } from './slots';

export interface BodyOptions {
  /** Idempotency key, the same on every retry of this wizard (rule 8). */
  requestId: string;
  choice?: StudentChoice;
}

/**
 * POST /booking: a trial is one lesson, a rule on the slot's local day that ends on it (invariant
 * 4); a paid package repeats weekly from the slot on its days. The new child is active when paid,
 * and carries the form's age and gender; the guardian its «عرفت عننا منين؟». Unanswered optional
 * questions are left out.
 */
export function toBookingRequest(d: TrialDraft, o: BodyOptions): BookingRequest | null {
  const phone = normalizePhone(d.phone);
  if (!d.teacher || !d.startsAt || !phone.ok) return null;
  const rule = ruleFromSlot(d.startsAt, d.tz);
  const base = {
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
    status: d.pkg === 'trial' ? ('trial' as const) : ('active' as const),
    teacher_gender_pref: d.gender,
  };
}
