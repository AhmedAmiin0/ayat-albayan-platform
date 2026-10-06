import type { BookingTeacherOption, Duration, Gender, PackageSize, Program } from '@ab/shared';
import { RIYADH_TZ, zonedParts } from '@/features/schedule/tz';
import type { BookingBody, BookingKind } from './contract';
import { invoiceInput, type InvoiceDraft, type MissedPick } from './draft.invoice';
import { isNewStudent, leadParts, newStudentReady, type NewStudentDraft } from './new-student';

export type { NewStudentDraft } from './new-student';
export type { InvoiceDraft, MissedPick } from './draft.invoice';

// The booking wizard's state and its mapping onto POST /booking (R-SCH-06, R-LEAD-06).
// Pure and unit-tested; the React steps only edit a BookingDraft.

export type StepKey = 'students' | 'missed' | 'teacher' | 'package' | 'slot' | 'invoice' | 'review';

// The package (and lesson length) comes before the slot: the repeat days depend on it. A trial
// has no invoice; a makeup picks the missed lesson instead of a package.
const FLOWS: Record<BookingKind, readonly StepKey[]> = {
  trial: ['students', 'teacher', 'package', 'slot', 'review'],
  package: ['students', 'teacher', 'package', 'slot', 'invoice', 'review'],
  makeup: ['students', 'missed', 'teacher', 'slot', 'invoice', 'review'],
};
export const stepsFor = (kind: BookingKind): readonly StepKey[] => FLOWS[kind];

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
    tz: RIYADH_TZ,
    program: 'quran',
    genderPref: null,
    country: null,
    teacher: null,
    durationMin: 45,
    startsAt: null,
    byday: [],
    pkg: kind === 'trial' ? 'trial' : '8',
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

/** A trial or a makeup is exactly one lesson: its rule repeats only on the first slot's day (docs/10 invariant 4). */
export function effectiveByday(d: Pick<BookingDraft, 'startsAt' | 'tz' | 'kind' | 'byday'>): number[] {
  if (!d.startsAt) return [];
  const { weekday } = ruleFromSlot(d.startsAt, d.tz);
  if (d.kind !== 'package') return [weekday];
  return [...new Set([weekday, ...d.byday])].sort((a, b) => a - b);
}

/** Whether «التالي» may leave `step`. */
export function stepReady(d: BookingDraft, step: StepKey): boolean {
  switch (step) {
    case 'students':
      if (d.kind === 'makeup') return d.students.length === 1 && !d.leadId;
      return isNewStudent(d) && d.students.length === 0 ? newStudentReady(d.newStudent) : d.students.length > 0;
    case 'missed':
      return d.missed !== null;
    case 'invoice':
      return d.invoice !== null;
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
export function toBookingRequest(d: BookingDraft, override?: string): BookingBody | null {
  if (!d.teacher || !d.startsAt) return null;
  if (d.kind === 'makeup' && !d.missed) return null;
  const rule = ruleFromSlot(d.startsAt, d.tz);
  const base = {
    teacherId: d.teacher.id,
    byday: effectiveByday(d),
    startTimeLocal: rule.startTimeLocal,
    tz: d.tz,
    durationMin: d.durationMin,
    startsOn: rule.startsOn,
    kind: d.kind,
    ...(d.kind === 'makeup' ? { makeupOfLessonId: d.missed?.lessonId } : { package: d.pkg }),
    ...(d.invoice && d.kind !== 'trial' ? { invoice: invoiceInput(d.invoice) } : {}),
    meetingLink: d.meetingLink.trim() || null,
    clientRequestId: d.requestId,
    startsAt: d.startsAt,
    ...(override ? { override: { reason: override } } : {}),
  };
  if (d.students.length > 0) {
    return { ...base, studentIds: d.students.map((s) => s.id), ...(d.leadId && d.kind !== 'makeup' ? { leadId: d.leadId } : {}) };
  }
  if (!d.leadId || !d.newStudent) return null;
  return { ...base, leadId: d.leadId, ...leadParts(d.newStudent, d), ...(d.force ? { force: true } : {}) };
}
