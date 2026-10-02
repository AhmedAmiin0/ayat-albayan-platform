import {
  normalizePhone,
  type BookingRequest,
  type BookingTeacherOption,
  type Duration,
  type Gender,
  type PackageSize,
  type Program,
} from '@ab/shared';
import { RIYADH_TZ, zonedParts } from '@/features/schedule/tz';

// The booking wizard's state and its mapping onto POST /booking (R-SCH-06, R-LEAD-06).
// Pure and unit-tested; the React steps only edit a BookingDraft.

/** The package (and lesson length) comes before the slot: the repeat days depend on it. */
export const STEPS = ['students', 'teacher', 'package', 'slot', 'review'] as const;
export type StepKey = (typeof STEPS)[number];

export type PickedStudent = { id: string; name: string; code: string | null };

/** Lead path: the new student + guardian typed in step 1 (phone prefilled from the lead). */
export interface NewStudentDraft {
  name: string;
  guardianName: string;
  guardianPhone: string;
}

export interface BookingDraft {
  /** Existing students (group = siblings); empty on the lead path. */
  students: PickedStudent[];
  /** Lead being converted (R-LEAD-06); null when booking from a student profile. */
  leadId: string | null;
  newStudent: NewStudentDraft | null;
  /** The family's zone: the rule's tz, so their wall clock stays fixed (docs/10 §5 route 14). */
  tz: string;
  program: Program;
  genderPref: Gender | null;
  /** Guardian country for the price (pricing quote currency); null = USD. */
  country: string | null;
  teacher: BookingTeacherOption | null;
  durationMin: Duration;
  /** First lesson, picked on the slot grid (UTC instant). */
  startsAt: string | null;
  byday: number[];
  pkg: PackageSize;
  meetingLink: string;
  /** Idempotency key of this wizard's POST /booking: a retry or double submit books once. */
  requestId: string;
  /** Lead path: create the new student although the guardian has a similar-named one (R-STU-03). */
  force: boolean;
}

export function emptyDraft(o: { leadId?: string | null; trial?: boolean } = {}): BookingDraft {
  return {
    students: [],
    leadId: o.leadId ?? null,
    newStudent: null,
    tz: RIYADH_TZ,
    program: 'quran',
    genderPref: null,
    country: null,
    teacher: null,
    durationMin: 45,
    startsAt: null,
    byday: [],
    pkg: o.trial ? 'trial' : '8',
    meetingLink: '',
    requestId: crypto.randomUUID(),
    force: false,
  };
}

/** The rule fields a picked first slot fixes, in the family's zone. */
export function ruleFromSlot(startsAt: string, tz: string): { startsOn: string; startTimeLocal: string; weekday: number } {
  const p = zonedParts(new Date(startsAt), tz);
  return { startsOn: p.date, startTimeLocal: p.time, weekday: p.weekday };
}

/** A trial is exactly one lesson: its rule repeats only on the first slot's day (docs/10 invariant 4). */
export function effectiveByday(d: Pick<BookingDraft, 'startsAt' | 'tz' | 'pkg' | 'byday'>): number[] {
  if (!d.startsAt) return [];
  const { weekday } = ruleFromSlot(d.startsAt, d.tz);
  if (d.pkg === 'trial') return [weekday];
  return [...new Set([weekday, ...d.byday])].sort((a, b) => a - b);
}

function newStudentReady(s: NewStudentDraft | null): boolean {
  return !!s && !!s.name.trim() && !!s.guardianName.trim() && normalizePhone(s.guardianPhone).ok;
}

/** Whether «التالي» may leave `step`. */
export function stepReady(d: BookingDraft, step: StepKey): boolean {
  switch (step) {
    case 'students':
      return d.leadId && d.students.length === 0 ? newStudentReady(d.newStudent) : d.students.length > 0;
    case 'teacher':
      return d.teacher !== null && d.teacher.has_availability;
    case 'slot':
      return d.startsAt !== null;
    case 'package':
    case 'review':
      return true;
  }
}

/** POST /booking body; `override` = the reason to book over conflicts (R-SCH-04). */
export function toBookingRequest(d: BookingDraft, override?: string): BookingRequest | null {
  if (!d.teacher || !d.startsAt) return null;
  const rule = ruleFromSlot(d.startsAt, d.tz);
  const base = {
    teacherId: d.teacher.id,
    byday: effectiveByday(d),
    startTimeLocal: rule.startTimeLocal,
    tz: d.tz,
    durationMin: d.durationMin,
    startsOn: rule.startsOn,
    package: d.pkg,
    meetingLink: d.meetingLink.trim() || null,
    clientRequestId: d.requestId,
    startsAt: d.startsAt,
    ...(override ? { override: { reason: override } } : {}),
  };
  if (d.students.length > 0) {
    return { ...base, studentIds: d.students.map((s) => s.id), ...(d.leadId ? { leadId: d.leadId } : {}) };
  }
  if (!d.leadId || !d.newStudent) return null;
  const s = d.newStudent;
  return {
    ...base,
    leadId: d.leadId,
    newStudent: {
      name: s.name.trim(),
      program: d.program,
      tz: d.tz,
      // A regular package from the chat's «اشترك» makes them a subscribed student straight away.
      status: d.pkg === 'trial' ? 'trial' : 'active',
      teacher_gender_pref: d.genderPref,
    },
    guardian: { name: s.guardianName.trim(), phone_e164: s.guardianPhone, tz: d.tz, country: d.country },
    ...(d.force ? { force: true } : {}),
  };
}
