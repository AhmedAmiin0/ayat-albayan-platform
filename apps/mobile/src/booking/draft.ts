import {
  normalizePhone,
  RIYADH_TZ,
  type BookingRequest,
  type BookingTeacherOption,
  type Duration,
  type Gender,
  type PackageSize,
  type PhoneCountry,
  type Program,
} from '@ab/shared';
import type { Lead } from '@/inbox/types';
import { effectiveByday, lessonMinutes, TRIAL_MINUTES } from './package-choice';
import { ruleFromSlot } from './slots';

// «حجز حلقة تجريبية» (or a package, from the chat's «اشترك») for a lead (R-MOB-02, R-LEAD-06):
// the wizard's state and its POST /booking body. Pure; the screens only edit a TrialDraft.

export { TRIAL_MINUTES } from './package-choice';

/** What the wizard needs of the lead: a cached GET /leads row, or the chat's lead. */
export type BookingLead = Pick<Lead, 'id' | 'name' | 'phone_e164'>;

export interface TrialDraft {
  leadId: string;
  studentName: string;
  guardianName: string;
  /** Prefilled from the lead's WhatsApp number, editable (a parent may book from another one). */
  phone: string;
  /** The family's zone: the new student's, the guardian's and the rule's (docs/10 §5 route 14). */
  tz: string;
  program: Program;
  gender: Gender | null;
  teacher: BookingTeacherOption | null;
  /** The picked free slot (UTC instant). */
  startsAt: string | null;
  /** 'trial', or a paid size (8, 12…) booked from the chat's «اشترك». */
  pkg: PackageSize;
  /** A paid package's lesson length; a trial is always TRIAL_MINUTES (lessonMinutes). */
  durationMin: Duration;
  /** A paid package's extra weekly days; the first slot's day is always in (effectiveByday). */
  byday: number[];
}

/** The answer to 409 duplicate_student: book that existing child, or create the new one anyway. */
export type StudentChoice = { existingId: string } | { force: true } | null;

const COUNTRY_TZ: Record<PhoneCountry, string> = {
  SA: 'Asia/Riyadh',
  EG: 'Africa/Cairo',
  AE: 'Asia/Dubai',
  QA: 'Asia/Qatar',
  KW: 'Asia/Kuwait',
  OM: 'Asia/Muscat',
};

/** The zone a phone's country suggests (the admin can change it); Riyadh when unknown. */
export function tzForPhone(phone: string): string {
  const p = normalizePhone(phone);
  return p.ok && p.country ? COUNTRY_TZ[p.country] : RIYADH_TZ;
}

/** The lead's number and WhatsApp name (the parent's) prefill the guardian; the child is typed. */
export function draftFromLead(lead: BookingLead, pkg: PackageSize = 'trial'): TrialDraft {
  return {
    leadId: lead.id,
    studentName: '',
    guardianName: lead.name ?? '',
    phone: lead.phone_e164,
    tz: tzForPhone(lead.phone_e164),
    program: 'quran',
    gender: null,
    teacher: null,
    startsAt: null,
    pkg,
    durationMin: TRIAL_MINUTES,
    byday: [],
  };
}

export type PhoneProblem = 'empty' | 'not_a_number' | 'invalid_length' | 'missing_country_code';

/** Why the typed phone is not a WhatsApp number we can store (rule 7), or null when it is. */
export function phoneProblem(phone: string): PhoneProblem | null {
  const p = normalizePhone(phone);
  return p.ok ? null : p.reason;
}

/** «التالي» on the first step: both names and a phone that normalizes to E.164. */
export function contactReady(
  d: Pick<TrialDraft, 'studentName' | 'guardianName' | 'phone'>,
): boolean {
  return Boolean(d.studentName.trim() && d.guardianName.trim()) && phoneProblem(d.phone) === null;
}

export interface BodyOptions {
  /** Idempotency key, the same on every retry of this wizard (rule 8). */
  requestId: string;
  choice?: StudentChoice;
}

/**
 * POST /booking: a trial is one lesson, a rule on the slot's local day that ends on it (invariant
 * 4); a paid package repeats weekly from the slot on its days. The new child is active when paid.
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
    durationMin: lessonMinutes(d),
    startsOn: rule.startsOn,
    package: d.pkg,
    clientRequestId: o.requestId,
    startsAt: d.startsAt,
    leadId: d.leadId,
  };
  if (o.choice && 'existingId' in o.choice) return { ...base, studentIds: [o.choice.existingId] };
  return {
    ...base,
    newStudent: {
      name: d.studentName.trim(),
      program: d.program,
      tz: d.tz,
      status: d.pkg === 'trial' ? 'trial' : 'active',
      teacher_gender_pref: d.gender,
    },
    guardian: {
      name: d.guardianName.trim(),
      phone_e164: phone.e164,
      tz: d.tz,
      country: phone.country,
    },
    ...(o.choice ? { force: true } : {}),
  };
}
