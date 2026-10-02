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
};

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

export type ChangeSet = {
  /** auth.users id stored as created_by; null for jobs / guardian replies. */
  actor: string | null;
  /** active → ended with ends_on = greatest(starts_on, ends_on); 409 rule_not_active otherwise. */
  end_rule?: { id: string; ends_on: string };
  changes?: LessonChange[];
  new_rule?: NewRule;
  lessons?: NewLesson[];
  messages?: QueuedMessage[];
};
