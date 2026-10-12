import type { BookingKind, BookingRequest, Conflict, LeadStatus, PackageSize } from '@ab/shared';
import type { Occurrence, RuleTiming } from '../scheduling/occurrences';
import {
  leadTarget,
  lessonRows,
  type BookingPayload,
  type InvoiceRow,
} from './booking.mapper';
import { confirmationDrafts } from './booking.messages';
import type { Resolved } from './booking.parties';
import type { BookingTeacher } from './booking.queries';

export type PayloadInput = {
  req: BookingRequest;
  kind: BookingKind;
  teacher: BookingTeacher;
  who: Resolved;
  lead: { id: string; status: LeadStatus } | null;
  plan: { timing: RuleTiming; occurrences: Occurrence[] };
  /** plan.occurrences[0], which the caller checked exists. */
  first: Occurrence;
  conflicts: Conflict[];
  /** The resolved meeting link copied onto every lesson. */
  meetingLink: string | null;
  /**
   * The link the confirmation names: meetingLink, or null while settings.meeting_link_auto is ON
   * (booking_confirmation_plain; the classroom link goes with the same-day reminder).
   */
  confirmationLink: string | null;
  /** The missed lesson, for a makeup. */
  makeupOf: string | null;
};

/** The rule's package: the request's, or none for a makeup (it has no package of its own). */
export const rulePackage = (req: BookingRequest, kind: BookingKind): PackageSize | null =>
  kind === 'makeup' ? null : (req.package ?? null);

/** What create_booking writes (docs/10 §5 #14), minus the invoice the service resolves afterwards. */
export function bookingPayload(input: PayloadInput): BookingPayload {
  const { req, kind, teacher, who, lead, plan, conflicts } = input;
  const reason = req.override?.reason ?? null;
  const pkg = rulePackage(req, kind);
  return {
    // The rule keeps only an explicit link, so a later change of the teacher's link reaches
    // the lessons the daily job generates (R-LES-01, issue B8).
    rule: {
      ...plan.timing,
      teacher_id: teacher.id,
      meeting_link: req.meetingLink ?? null,
      package: pkg,
      client_request_id: req.clientRequestId ?? null,
    },
    student_ids: who.student_ids,
    lead: lead && { id: lead.id, from: lead.status, to: leadTarget(lead.status, pkg) },
    new_guardian: who.new_guardian,
    new_student: who.new_student,
    lessons: lessonRows({
      occurrences: plan.occurrences,
      conflicts,
      reason,
      meetingLink: input.meetingLink,
    }),
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
      },
    },
  };
}

/** The payload with its stored invoice (null for a trial); the audit row says where it came from. */
export function withInvoice(payload: BookingPayload, invoice: InvoiceRow | null): BookingPayload {
  const after = { ...payload.audit.after, invoice_source: invoice?.source ?? null };
  return { ...payload, invoice, audit: { after } };
}
