import type { Json } from '@ab/db';
import type { Attendance, LessonStatus, PackageSize } from '@ab/shared';

// Payload of public.apply_lesson_changes (migration 100): the API decides, the RPC applies it in
// one transaction. snake_case like the columns; instants ISO-8601 UTC; dates local "YYYY-MM-DD".

/** Compare-and-set of one lesson's status, plus its lesson_students columns. */
export type LessonChange = {
  id: string;
  from_status: LessonStatus;
  to_status: LessonStatus;
  cancel_reason?: string;
  confirmed_at?: string;
  confirmed_by?: string | null;
  attendance?: Attendance;
  chargeable?: boolean;
  /** Per-student outcome over the lesson-wide one (group / sibling lesson, R-STU-04). */
  students?: StudentOutcome[];
};

export type StudentOutcome = { student_id: string; attendance: Attendance; chargeable: boolean };

/** audit_log row written inside the same transaction (R-NFR-03); actor = ChangeSet.actor. */
export type AuditRow = { entity: string; entity_id: string; action: string; before?: Json; after?: Json };

export type NewLesson = {
  id: string;
  rule_id: string | null;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  meeting_link: string | null;
  override_reason: string | null;
  rescheduled_from_id: string | null;
  student_ids: string[];
};

export type NewRule = {
  id: string;
  teacher_id: string;
  duration_min: number;
  start_time_local: string;
  tz: string;
  byday: number[];
  starts_on: string;
  ends_on: string | null;
  meeting_link: string | null;
  package: PackageSize | null;
  created_from_lead_id: string | null;
  /** The assistant's course this rule belongs to (migration 470); carried by a reschedule. */
  subscription_id: string | null;
  /** The booking's first rule when this is one of its other times (migration 465). */
  first_rule_id: string | null;
  student_ids: string[];
};

/** A queued outbound WhatsApp template (docs/10 §5.11); sending is Phase 4. */
export type QueuedMessage = {
  phone_e164: string;
  guardian_id: string;
  lesson_id: string;
  template_key: string;
  template_params: Record<string, string>;
  dedup_key: string;
};

/** Payload of public.edit_lesson_time (migration 174, R-SCH-11): one lesson's time, in place. */
export type TimeEditChange = {
  actor: string;
  lesson_id: string;
  /** Compare-and-set: the row must still look like this, else 409 stale_time. */
  from: { status: LessonStatus; starts_at: string; ends_at: string };
  to: { starts_at: string; ends_at: string };
  reason: string | null;
  override_reason: string | null;
  /** An open lesson with a new start: queued old-time messages expire, reminder keys are freed. */
  retime_open: boolean;
  /** A held lesson with a new start or length: the report PDF is re-rendered. */
  refresh_pdf: boolean;
  messages: QueuedMessage[];
  audit: AuditRow;
};

export type ChangeSet = {
  /** auth.users id stored as created_by; null for jobs / guardian replies. */
  actor: string | null;
  /**
   * ends_on = greatest(starts_on, ends_on); the rule ends now when that day is past in its tz,
   * else stays active until the daily job ends it. 409 rule_not_active when it isn't active.
   */
  end_rule?: { id: string; ends_on: string };
  changes?: LessonChange[];
  new_rule?: NewRule;
  lessons?: NewLesson[];
  messages?: QueuedMessage[];
  audit?: AuditRow;
};
