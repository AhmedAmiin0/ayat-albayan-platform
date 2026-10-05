import type { Attendance, Gender, LessonStatus, Program, StudentStatus } from '../enums/index.js';
import type { Conflict } from './conflicts.js';
import type { LessonEvent } from './state-machine.js';
import type { LessonTimeEditView, TimeEditMode } from './time-edit.js';

// Phase 2 API response shapes (docs/10-phase2-contracts.md §3). Responses are snake_case like
// every other API row; instants are ISO-8601 UTC strings; tz fields are IANA ids.

/** One student on a lesson. */
export interface LessonStudentView {
  id: string;
  code: string;
  name: string;
  tz: string;
  attendance: Attendance | null;
  chargeable: boolean;
  /** Lesson number for this student (v_lesson_sequence), null until the lesson is completed. */
  seq: number | null;
  /**
   * R-SUB-02 «الباقة مش مدفوعة»: true on a future open lesson when the student's newest package is
   * unpaid with nothing left (setting flag_future_lessons_when_unpaid). Absent otherwise.
   */
  unpaid?: boolean;
  /** The active حجز تعويضي booked for this student's miss of the lesson (a group's others may have none). */
  makeup?: { lesson_id: string; starts_at: string } | null;
}

/** GET /lessons, /lessons/day, /teachers/me/lessons, /students/:id/lessons items. */
export interface LessonView {
  id: string;
  rule_id: string | null;
  /** The weekly rule's weekdays (0 = الأحد) in its zone; null for a one-off. Absent in an old cache. */
  rule_byday?: number[] | null;
  /** The rule is a حلقة تجريبية (schedule_rules.package = 'trial'); a one-off move keeps it. Absent in an old cache. */
  trial?: boolean;
  /** A حجز تعويضي: replaces a missed lesson, never consumes a package unit (lessons.makeup_of_id). */
  makeup?: boolean;
  /** For a makeup: the missed lesson it replaces. */
  makeup_of?: { id: string; starts_at: string } | null;
  teacher: { id: string; display_name_ar: string; display_name_en?: string | null; tz: string };
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  /** Copied onto the lesson at creation (R-LES-01), sent to the guardian (R-LES-02). */
  meeting_link: string | null;
  cancel_reason: string | null;
  override_reason: string | null;
  confirmed_at: string | null;
  rescheduled_from_id: string | null;
  /** «افتح الحلقة الآن»: the room opened early (joinWindow); «حلقة فورية»: never consumes a package. */
  room_opened_at?: string | null;
  instant?: boolean;
  students: LessonStudentView[];
  /** allowedLessonEvents(status) minus what the caller's role may not do. */
  allowed_events: LessonEvent[];
  /**
   * Clashes found when the daily job / extend generated this lesson without an admin override
   * (R-SCH-04: e.g. a DST change moved it onto another lesson). [] = none.
   */
  conflicts: Conflict[];
  /** The teacher's pending «اقترح ميعاد تاني» (R-SCH-08), null when there is none. */
  pending_proposal: LessonProposalView | null;
  /** R-SCH-11 «عدّل الوقت»: what an admin may do to the time (null = nothing, and for teachers). Absent in an old cache. */
  time_edit_mode?: TimeEditMode | null;
  /** The last in-place time edit (the time it replaced), null when never edited. */
  time_edit?: LessonTimeEditView | null;
}

/** A teacher's proposed new time for one lesson; an admin approves (reschedule) or rejects. */
export interface LessonProposalView {
  id: string;
  proposed_starts_at: string;
  note: string | null;
  created_at: string;
}

/** GET /settings (admin). late_cancel_hours null = OFF. Phase 3 keys: migration 123. */
export interface AcademySettings {
  late_cancel_hours: number | null;
  booking_horizon_weeks: number;
  renewal_alert_remaining: number;
  flag_future_lessons_when_unpaid: boolean;
  report_teacher_edit_hours: number;
  reporting_currency: string;
  payout_count_late: boolean;
  payout_count_no_show: boolean;
  /** Trial lessons count toward teacher pay (migration 20261005000200; default false). */
  payout_count_trials: boolean;
  /** Phase 4 (docs/12 §2): R-LEAD-05 hours after the last inbound message, ascending. */
  follow_up_hours: number[];
  reminder_minutes_before: number;
  reminder_24h_enabled: boolean;
  /** The admin's kill switch; the sender also needs env MESSAGING_ENABLED=true. */
  messaging_enabled: boolean;
  /** Reminders, follow-ups and renewal_due from the jobs (migration 162); admin sends ignore it. */
  auto_messages_enabled: boolean;
  /** The academy number moved off the old CRM (docs/09 cut-over): the CRM warning goes away. */
  crm_cutover_done: boolean;
  /** A new lead goes to the salesperson with the fewest open leads (migration 187). */
  sales_auto_assign: boolean;
}

/** GET /teachers/me (R-TCH-03). */
export interface TeacherMe {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  meeting_link: string | null;
  students: { id: string; code: string; name: string; tz: string; status: StudentStatus }[];
}

/** GET /booking/teachers items (R-SCH-06). */
export interface BookingTeacherOption {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  meeting_link: string | null;
  students_count: number;
  max_students: number | null;
  /** false = no weekly availability rows; the wizard shows the teacher disabled. */
  has_availability: boolean;
}

/** GET /booking/slots: candidate starts inside the teacher's availability; [] conflicts = free. */
export interface SlotView {
  starts_at: string;
  ends_at: string;
  conflicts: Conflict[];
}
export interface SlotsResponse {
  teacher_tz: string;
  step_min: number;
  slots: SlotView[];
}

/** POST /booking 201. */
export interface BookingResult {
  rule_id: string;
  student_ids: string[];
  guardian_ids: string[];
  lessons: { id: string; starts_at: string; ends_at: string }[];
  /** Queued booking_confirmation* messages, one per guardian (docs/10 §5.11). */
  message_ids: string[];
  /** The stored فاتورة (null for a trial). */
  invoice_id: string | null;
}
