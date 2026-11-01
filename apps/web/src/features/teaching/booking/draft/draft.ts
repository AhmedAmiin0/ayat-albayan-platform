import {
  ACADEMY_TZ,
  type BookingTeacherOption,
  courseBodyPackage,
  type Duration,
  type Gender,
  type PackageSize,
  type Program,
  zonedPartsIn,
} from '@ab/shared';
import type { BookingBody, BookingKind } from './contract';
import { invoiceInput, type InvoiceDraft, type MissedPick } from './draft.invoice';
import { pickedRule } from './draft.days';
import type { CourseDraft, TrialDateDraft } from './draft.flows';
import { leadParts, type NewStudentDraft } from '@/features/teaching/booking/steps/who/new-student';

export type { NewStudentDraft } from '@/features/teaching/booking/steps/who/new-student';
export type { InvoiceDraft, MissedPick } from './draft.invoice';
export type { CourseDraft, TrialDateDraft } from './draft.flows';

// The booking wizard's state and its mapping onto POST /booking (R-SCH-06, R-LEAD-06).
// Pure and unit-tested; the React steps only edit a BookingDraft.

export type StepKey = 'students' | 'missed' | 'teacher' | 'package' | 'slot' | 'invoice' | 'review';

export { stepReady, stepsFor, stepsOf } from './draft.steps';
export { days, draftPicks, pickPatch, withPicks } from './draft.days';

export type PickedStudent = { id: string; name: string; code: string | null };

export interface BookingDraft {
  /** تجريبية | اشتراك | حجز تعويضي (R-SCH-10). */
  kind: BookingKind;
  /** Non-trial: the payment proof (R-PAY-03); null until uploaded or picked from the chat. */
  invoice: InvoiceDraft | null;
  /** Makeup: the missed lesson being replaced. */
  missed: MissedPick | null;
  /** The family's WhatsApp number (E.164) for «من الشات»; null when unknown (the lead path derives it). */
  chatPhone: string | null;
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
  /** First lesson, picked on the slot grid (UTC instant): the earliest pick. */
  startsAt: string | null;
  /** A package: the other picked slots (UTC instants), one per weekday, each at its own time. */
  extra: string[];
  /** The assistant books a subscription's course: its fixed day count and lesson count; else null. */
  course: CourseDraft | null;
  /** «موعد تجريبي جديد» for an existing student (owner 2026-10-25); absent = any other booking. */
  trialDate?: TrialDateDraft | null;
  pkg: PackageSize;
  meetingLink: string;
  /** Idempotency key of this wizard's POST /booking: a retry or double submit books once. */
  requestId: string;
  /** Lead path: create the new student although the guardian has a similar-named one (R-STU-03). */
  force: boolean;
}

export function emptyDraft(o: { leadId?: string | null; trial?: boolean; kind?: BookingKind } = {}): BookingDraft {
  const kind = o.kind ?? (o.trial ? 'trial' : 'package');
  return {
    kind,
    invoice: null,
    missed: null,
    chatPhone: null,
    students: [],
    leadId: o.leadId ?? null,
    newStudent: null,
    tz: ACADEMY_TZ, // data default (docs/34 —): the family's zone until a guardian is picked
    program: 'quran',
    genderPref: null,
    country: null,
    teacher: null,
    durationMin: 45,
    startsAt: null,
    extra: [],
    course: null,
    pkg: kind === 'trial' ? 'trial' : '8',
    meetingLink: '',
    requestId: crypto.randomUUID(),
    force: false,
  };
}

/** The rule fields a picked first slot fixes, in the family's zone. */
export function ruleFromSlot(startsAt: string, tz: string): { startsOn: string; startTimeLocal: string; weekday: number } {
  const p = zonedPartsIn(new Date(startsAt), tz);
  return { startsOn: p.date, startTimeLocal: p.time, weekday: p.weekday };
}

/**
 * The request's package. A course sends courseBodyPackage (the schema needs a paid size; the API
 * ignores it and labels the rule with the subscription's own package): never shown in the UI.
 */
const packageField = (d: Pick<BookingDraft, 'pkg' | 'course'>): { package: PackageSize } => ({
  package: d.course ? courseBodyPackage(d.course) : d.pkg,
});

/** POST /booking body; `override` = the reason to book over conflicts (R-SCH-04). */
export function toBookingRequest(d: BookingDraft, override?: string): BookingBody | null {
  if (!d.teacher || !d.startsAt) return null;
  if (d.kind === 'makeup' && !d.missed) return null;
  // A trial or a makeup is exactly one lesson: one pick, on the first slot's day (docs/10 invariant 4).
  const rule = pickedRule(d);
  if (!rule) return null;
  const base = {
    teacherId: d.teacher.id,
    byday: rule.byday,
    startTimeLocal: rule.startTimeLocal,
    ...(rule.dayTimes.length > 0 ? { dayTimes: rule.dayTimes } : {}),
    tz: d.tz,
    durationMin: d.durationMin,
    startsOn: rule.startsOn,
    kind: d.kind,
    ...(d.kind === 'makeup' ? { makeupOfLessonId: d.missed?.lessonId } : packageField(d)),
    ...(d.invoice && d.kind !== 'trial' ? { invoice: invoiceInput(d.invoice) } : {}),
    meetingLink: d.meetingLink.trim() || null,
    clientRequestId: d.requestId,
    startsAt: rule.startsAt,
    ...(override ? { override: { reason: override } } : {}),
  };
  if (d.students.length > 0) {
    return { ...base, studentIds: d.students.map((s) => s.id), ...(d.leadId && d.kind !== 'makeup' ? { leadId: d.leadId } : {}) };
  }
  if (!d.leadId || !d.newStudent) return null;
  return { ...base, leadId: d.leadId, ...leadParts(d.newStudent, d), ...(d.force ? { force: true } : {}) };
}
