import {
  GENDERS,
  normalizePhone,
  registrationStatus,
  type BookingRequest,
  type Gender,
  type LeadQualification,
  type LeadSource,
  type PackageSize,
  type Program,
} from '@ab/shared';
import type { InboxLead } from '@/features/inbox/api/api';
import { parseAge } from '@/features/students/create/create-student';

// The lead path's new student + guardian (R-LEAD-06): what step 1 edits, what the lead's
// «بيانات الطالب» prefills (research-forms item 2) and how it maps onto POST /booking.

/** What the qualification captured beyond step 1's fields; it lands on the new student row. */
export type CarriedFacts = Pick<LeadQualification, 'level' | 'memorized' | 'goal' | 'riwaya' | 'notes'>;

/** Lead path: the new student + guardian typed in step 1 (phone prefilled from the lead). */
export interface NewStudentDraft {
  name: string;
  guardianName: string;
  guardianPhone: string;
  /** «سن الطالب» as typed (3–99); '' or absent = not given. */
  age?: string;
  gender?: Gender | '';
  /** «عرفت عننا منين؟», prefilled from the lead's source. */
  source?: LeadSource | '';
  carried?: CarriedFacts;
}

/** The lead's qualification → step 1, and the zone it gave (null = keep the default). */
export function newStudentFromLead(
  lead: InboxLead | null,
  search: { name?: string | undefined; phone?: string | undefined },
): { student: NewStudentDraft; tz: string | null } {
  const q = lead?.qualification ?? {};
  const student: NewStudentDraft = {
    name: q.student_name ?? '',
    guardianName: q.guardian_name ?? search.name ?? '',
    guardianPhone: search.phone ?? '',
    age: q.age ? String(q.age) : '',
    gender: GENDERS.find((g) => g === q.gender) ?? '',
    source: lead?.source ?? '',
    carried: { level: q.level, memorized: q.memorized, goal: q.goal, riwaya: q.riwaya, notes: q.notes },
  };
  return { student, tz: q.tz ?? lead?.tz ?? null };
}

/** A new guardian + student is typed in step 1: from a lead (R-LEAD-06) or an assistant's registration. */
export const isNewStudent = (d: { leadId: string | null; newStudent: NewStudentDraft | null }): boolean =>
  d.leadId !== null || d.newStudent !== null;

/** Name, guardian name, a phone that becomes E.164 and, when typed, an age 3–99. */
export function newStudentReady(s: NewStudentDraft | null): boolean {
  if (!s || !s.name.trim() || !s.guardianName.trim() || !normalizePhone(s.guardianPhone).ok) return false;
  return parseAge(s.age ?? '') !== undefined;
}

type LeadParts = Pick<Extract<BookingRequest, { newStudent: unknown }>, 'newStudent' | 'guardian'>;
type Family = { program: Program; tz: string; pkg: PackageSize; genderPref: Gender | null; country: string | null };

const blankToNull = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);

/** POST /booking's newStudent + guardian. A trial lesson books a «trial» student, a regular package
 * («اشترك») a «new» one (registrationStatus, docs/18 row 1): only a positive payment makes it active. */
export function leadParts(s: NewStudentDraft, f: Family): LeadParts {
  const c = s.carried ?? {};
  return {
    newStudent: {
      name: s.name.trim(),
      program: f.program,
      tz: f.tz,
      status: registrationStatus(f.pkg === 'trial'),
      teacher_gender_pref: f.genderPref,
      age: parseAge(s.age ?? '') ?? null,
      gender: s.gender || null,
      level: blankToNull(c.level),
      memorized: blankToNull(c.memorized),
      goal: blankToNull(c.goal),
      riwaya: blankToNull(c.riwaya),
      notes: blankToNull(c.notes),
    },
    guardian: { name: s.guardianName.trim(), phone_e164: s.guardianPhone, tz: f.tz, country: f.country, source: s.source || null },
  };
}
