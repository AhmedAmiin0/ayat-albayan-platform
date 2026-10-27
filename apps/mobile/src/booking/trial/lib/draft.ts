import {
  LEAD_SOURCES,
  normalizePhone,
  RIYADH_TZ,
  TZ_OPTIONS,
  type BookingTeacherOption,
  type Duration,
  type Gender,
  type LeadSource,
  type PackageSize,
  type PhoneCountry,
  type Program,
} from '@ab/shared';
import { qualForm } from '@/inbox/qualification/qualification-form';
import type { Lead } from '@/inbox/shared/types';
import type { BookingKind, InvoiceDraft } from '../../shared/contract';
import { DEFAULT_MINUTES } from './package-choice';

// «حجز حلقة تجريبية» (or a package, from the chat's «اشترك») for a lead (R-MOB-02, R-LEAD-06):
// the wizard's state. Pure; the screens only edit a TrialDraft (booking-body.ts sends it).

/** What the wizard needs of the lead: a cached GET /leads row (with its answers), or the chat's lead. */
export type BookingLead = Pick<Lead, 'id' | 'name' | 'phone_e164'> & {
  source?: LeadSource;
  /** leads.qualification (jsonb): «بيانات الطالب» prefill the child (R-LEAD-03). */
  qualification?: unknown;
};

/** A source from a route param (the chat's lead), checked against the enum. */
export const isLeadSource = (v: unknown): v is LeadSource => LEAD_SOURCES.some((s) => s === v);

export interface TrialDraft {
  leadId: string;
  studentName: string;
  /** «سن الطالب» as typed; empty = not asked (optional on the form). */
  age: string;
  /** «النوع» of the child; not the teacher-gender preference below. */
  studentGender: Gender | null;
  guardianName: string;
  /** Prefilled from the lead's WhatsApp number, editable (a parent may book from another one). */
  phone: string;
  /** The family's zone: the new student's, the guardian's and the rule's (docs/10 §5 route 14). */
  tz: string;
  /** «عرفت عننا منين؟»: the guardian's source, prefilled from the lead's. */
  source: LeadSource | null;
  /** «رقم الواتساب لـ: الطالب نفسه» (docs/30 §1); absent / false = «ولي الأمر». */
  contactIsSelf?: boolean;
  program: Program;
  /** Teacher-gender preference (R-SCH-06); null = «مش فارقة». */
  gender: Gender | null;
  teacher: BookingTeacherOption | null;
  /** The picked free slot (UTC instant); a package's earliest pick (picks.ts). */
  startsAt: string | null;
  /** «نوع الحجز»: a trial or a package (a makeup has its own wizard: makeup-draft.ts). */
  kind: Exclude<BookingKind, 'makeup'>;
  /** 'trial' for a trial, else a paid size (8, 12…); set together with `kind` (kindPatch). */
  pkg: PackageSize;
  /** «الفاتورة»: the payment proof, required for a package, never asked for a trial. */
  invoice: InvoiceDraft | null;
  /** «المده»: the lesson length the slots and the rule use (the form's default 45). */
  durationMin: Duration;
  /** A paid package's other picks (one per family-tz weekday, each with its own time), sorted. */
  extra: string[];
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

const ZONES: readonly string[] = TZ_OPTIONS;

/**
 * The lead prefills the wizard: the number, the parent's name (asked, else the WhatsApp name) and
 * whatever «بيانات الطالب» already holds (the child's name, age, gender and zone), plus the source.
 */
export function draftFromLead(lead: BookingLead, pkg: PackageSize = 'trial'): TrialDraft {
  const q = qualForm(lead.qualification);
  return {
    leadId: lead.id,
    studentName: q.student_name,
    age: q.age,
    studentGender: q.gender || null,
    guardianName: q.guardian_name || (lead.name ?? ''),
    phone: lead.phone_e164,
    tz: ZONES.includes(q.tz) ? q.tz : tzForPhone(lead.phone_e164),
    source: lead.source ?? null,
    program: 'quran',
    gender: null,
    teacher: null,
    startsAt: null,
    kind: pkg === 'trial' ? 'trial' : 'package',
    pkg,
    invoice: null,
    durationMin: DEFAULT_MINUTES,
    extra: [],
  };
}

type PhoneProblem = 'empty' | 'not_a_number' | 'invalid_length' | 'missing_country_code';

/** Why the typed phone is not a WhatsApp number we can store (rule 7), or null when it is. */
export function phoneProblem(phone: string): PhoneProblem | null {
  const p = normalizePhone(phone);
  return p.ok ? null : p.reason;
}

/** «سن الطالب» is optional; typed, it is a whole number 3–99 (the form's own check). */
export function ageValid(age: string): boolean {
  const text = age.trim();
  const n = Number(text);
  return !text || (/^\d+$/.test(text) && n >= 3 && n <= 99);
}

/** «التالي» on the first step: both names, a phone that normalizes to E.164, a sane age. */
export function contactReady(
  d: Pick<TrialDraft, 'studentName' | 'guardianName' | 'phone' | 'age'>,
): boolean {
  return (
    Boolean(d.studentName.trim() && d.guardianName.trim()) &&
    phoneProblem(d.phone) === null &&
    ageValid(d.age)
  );
}
