import type {
  BookingResult,
  Conflict,
  GuardianCreate,
  LeadStatus,
  PackageSize,
  StudentCreate,
} from '@ab/shared';
import type { Json } from '@ab/db';
import { z } from 'zod';
import { canTransitionLead } from '../leads/lead-state-machine';
import type { Occurrence, RuleTiming } from '../scheduling/occurrences';
import type { MessageDraft } from './booking.messages';

export type LessonRow = {
  starts_at: string;
  ends_at: string;
  meeting_link: string | null;
  override_reason: string | null;
};
export type RuleRow = RuleTiming & {
  teacher_id: string;
  /** Only the admin's explicit link: lessons resolve the current teacher link (issue B8). */
  meeting_link: string | null;
  package: PackageSize;
  /** Idempotency key: a replay returns the first booking (migration 111). */
  client_request_id: string | null;
};
export type NewStudentRow = Omit<StudentCreate, 'guardian_id' | 'teacher_id'> & {
  name_normalized: string;
};

/** The create_booking(p_booking) argument (migrations 090, 111). */
export type BookingPayload = {
  rule: RuleRow;
  student_ids: string[];
  lead: { id: string; from: LeadStatus; to: LeadStatus | null } | null;
  new_guardian: GuardianCreate | null;
  new_student: NewStudentRow | null;
  lessons: LessonRow[];
  messages: MessageDraft[];
  /** audit_log.after of the 'book' row, written in the same transaction (R-NFR-03). */
  audit: { after: { [key: string]: Json | undefined } };
};

export type LinkInput = {
  requested?: string | null;
  /** meeting_link_override of every booked student. */
  overrides: readonly (string | null | undefined)[];
  teacherLink: string | null;
};

/** Request link → the single student's override → the teacher's link (R-LES-01, issue B8). */
export function meetingLinkFor(input: LinkInput): string | null {
  if (input.requested) return input.requested;
  const [only] = input.overrides;
  if (input.overrides.length === 1 && only) return only;
  return input.teacherLink;
}

/** trial → trial_booked, paid → converted, only when the lead funnel allows it (R-LEAD-06). */
export function leadTarget(status: LeadStatus, pkg: PackageSize): LeadStatus | null {
  const to: LeadStatus = pkg === 'trial' ? 'trial_booked' : 'converted';
  return canTransitionLead(status, to) ? to : null;
}

export type LessonRowsInput = {
  occurrences: readonly Occurrence[];
  conflicts: readonly Conflict[];
  reason: string | null;
  /** The resolved link copied onto every lesson (docs/10 invariant 3). */
  meetingLink: string | null;
};

/** Lessons for the RPC; an override reason lands only on the occurrences that clash (R-SCH-04). */
export function lessonRows({ occurrences, conflicts, reason, meetingLink }: LessonRowsInput): LessonRow[] {
  const clashing = new Set(conflicts.map((c) => c.startsAt));
  return occurrences.map((o) => {
    const starts_at = o.starts_at.toISOString();
    const override_reason = clashing.has(starts_at) ? reason : null;
    return { starts_at, ends_at: o.ends_at.toISOString(), meeting_link: meetingLink, override_reason };
  });
}

const rpcResult = z.object({
  rule_id: z.string(),
  student_ids: z.array(z.string()),
  guardian_ids: z.array(z.string()),
  lessons: z.array(z.object({ id: z.string(), starts_at: z.string(), ends_at: z.string() })),
  message_ids: z.array(z.string()),
});
const iso = (pgTime: string) => new Date(pgTime).toISOString();

/** create_booking's jsonb → BookingResult with UTC ISO instants. Throws on an unexpected shape. */
export function toBookingResult(data: unknown): BookingResult {
  const r = rpcResult.parse(data);
  const lessons = r.lessons.map((l) => ({ id: l.id, starts_at: iso(l.starts_at), ends_at: iso(l.ends_at) }));
  return { ...r, lessons };
}
