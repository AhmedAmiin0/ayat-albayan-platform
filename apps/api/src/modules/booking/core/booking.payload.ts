import { bookingKindOf, registrationStatus, type BookingKind, type BookingRequest, type Conflict, type LeadStatus, type PackageSize } from '@ab/shared';
import type { Occurrence } from '../../scheduling/occurrences';
import {
  leadTarget,
  lessonRows,
  type BookingPayload,
  type InvoiceRow,
  type SiblingRow,
} from './booking.mapper';
import { courseAudit, courseTie, type CourseLabel } from './booking.course-label';
import { confirmationDrafts } from './booking.messages';
import type { Resolved } from './booking.parties';
import type { Plan } from '../plan/booking.plan';
import type { BookingTeacher } from './booking.queries';

export type { CourseLabel } from './booking.course-label';

export type PayloadInput = {
  req: BookingRequest;
  kind: BookingKind;
  teacher: BookingTeacher;
  who: Resolved;
  lead: { id: string; status: LeadStatus } | null;
  /** The first rule: the earliest time group (planSeries). */
  plan: Plan;
  /** The booking's other time groups, later in planSeries order; [] for one start time. */
  siblings: readonly Plan[];
  /** plan.occurrences[0], which the caller checked exists. */
  first: Occurrence;
  conflicts: Conflict[];
  /** The resolved meeting link copied onto every lesson. */
  meetingLink: string | null;
  /**
   * The link the confirmation names: meetingLink, or null for a teacher who holds lessons in our
   * classroom (usesPlatform(meeting_mode, settings.meeting_link_auto); booking_confirmation_plain; the classroom link goes with the same-day reminder).
   */
  confirmationLink: string | null;
  /** The missed lesson, for a makeup. */
  makeupOf: string | null;
  /** The assistant's course: the subscription's label and id on every rule, whatever the request says. */
  course?: CourseLabel | undefined;
};


/** The rule's package: the request's, or none for a makeup (it has no package of its own). */
export const rulePackage = (req: BookingRequest, kind: BookingKind): PackageSize | null =>
  kind === 'makeup' ? null : (req.package ?? null);

/**
 * The lead path's new student (owner 2026-10-15, docs/11 §7): booked with a trial lesson it starts as
 * trial (registrationStatus), else as the request says (the schema default is new). create_booking
 * keeps this explicit status.
 */
export function newStudentRow(who: Resolved, kind: BookingKind): Resolved['new_student'] {
  const s = who.new_student;
  if (!s || kind !== 'trial' || s.status !== 'new') return s;
  return { ...s, status: registrationStatus(true) };
}

/**
 * docs/18 row 1 (owner 2026-10-15): a lead booked straight onto a package starts `new` and becomes
 * `active` only with a positive payment. Any status sent by a caller but an admin is ignored: it
 * becomes the registration status (trial with a trial lesson, else new). Applied by both POST
 * /booking controllers, where the caller's role is known.
 */
export function clientRequest(req: BookingRequest, role: string | null): BookingRequest {
  if (role === 'admin' || !('newStudent' in req)) return req;
  return { ...req, newStudent: { ...req.newStudent, status: registrationStatus(bookingKindOf(req) === 'trial') } };
}


/** The other times' rules and lessons: the same link, package, subscription and override rule as the first. */
function siblingRows(input: PayloadInput, pkg: PackageSize | null): SiblingRow[] {
  const { req, conflicts } = input;
  return input.siblings.map((p) => ({
    rule: { ...p.timing, meeting_link: req.meetingLink ?? null, package: pkg, ...courseTie(input.course) },
    lessons: lessonRows({
      occurrences: p.occurrences,
      conflicts,
      reason: req.override?.reason ?? null,
      meetingLink: input.meetingLink,
    }),
  }));
}

/** audit.after.day_times only when the request has per-day times (an old body's audit is unchanged). */
const dayTimesAudit = (req: BookingRequest) =>
  req.dayTimes?.length ? { day_times: req.dayTimes.map((d) => ({ weekday: d.weekday, start_time_local: d.startTimeLocal })) } : {};

/** What create_booking writes (docs/10 §5 #14), minus the invoice the service resolves afterwards. */
export function bookingPayload(input: PayloadInput): BookingPayload {
  const { req, kind, teacher, who, lead, plan, conflicts } = input;
  const reason = req.override?.reason ?? null;
  const pkg = input.course ? input.course.package : rulePackage(req, kind);
  return {
    // The rule keeps only an explicit link, so a later change of the teacher's link reaches
    // the lessons the daily job generates (R-LES-01, issue B8).
    rule: {
      ...plan.timing,
      teacher_id: teacher.id,
      meeting_link: req.meetingLink ?? null,
      package: pkg,
      client_request_id: req.clientRequestId ?? null,
      ...courseTie(input.course),
    },
    student_ids: who.student_ids,
    lead: lead && { id: lead.id, from: lead.status, to: leadTarget(lead.status, pkg) },
    new_guardian: who.new_guardian,
    new_student: newStudentRow(who, kind),
    lessons: lessonRows({
      occurrences: plan.occurrences,
      conflicts,
      reason,
      meetingLink: input.meetingLink,
    }),
    siblings: siblingRows(input, pkg),
    messages: confirmationDrafts({
      students: who.booked,
      firstStart: input.first.starts_at,
      meetingLink: input.confirmationLink,
      kind,
    }),
    makeup_of: input.makeupOf,
    invoice: null,
    audit: {
      after: {
        kind,
        package: pkg,
        lead_id: req.leadId ?? null,
        override_reason: reason,
        conflicts: conflicts.map((c) => ({ ...c })),
        ...dayTimesAudit(req),
        ...courseAudit(input.course),
      },
    },
  };
}

/** The payload with its stored invoice (null for a trial); the audit row says where it came from. */
export function withInvoice(payload: BookingPayload, invoice: InvoiceRow | null): BookingPayload {
  const after = { ...payload.audit.after, invoice_source: invoice?.source ?? null };
  return { ...payload, invoice, audit: { after } };
}
