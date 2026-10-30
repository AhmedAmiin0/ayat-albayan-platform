import type { Attendance, Gender, LessonStatus, Program, ReportStatus, StudentStatus } from '../../enums/index.js';
import type { Conflict } from './conflicts.js';
import type { LessonEvent } from './state-machine.js';
import type { LessonTimeEditView, TimeEditMode } from './series/time-edit.js';
import type { TeacherMeetingMode } from '../classroom/meeting-mode.js';

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
  /** This student's تقرير الحلقة (draft or submitted), null before one is opened. Absent in an old cache. */
  report?: { id: string; status: ReportStatus } | null;
}

/** GET /lessons, /lessons/day, /teachers/me/lessons, /students/:id/lessons items. */
export interface LessonView {
  id: string;
  rule_id: string | null;
  /** The weekly rule's weekdays (0 = الأحد) in its zone; null for a one-off. Absent in an old cache. */
  rule_byday?: number[] | null;
  /** The rule is a حلقة تجريبية (schedule_rules.package = 'trial'); a one-off move keeps it. Absent in an old cache. */
  trial?: boolean;
  /** The assistant course its rule belongs to (schedule_rules.subscription_id): «تغيير أيام الحلقات». Absent in an old cache. */
  course_subscription_id?: string | null;
  /** A حجز تعويضي: replaces a missed lesson, never consumes a package unit (lessons.makeup_of_id). */
  makeup?: boolean;
  /** For a makeup: the missed lesson it replaces. */
  makeup_of?: { id: string; starts_at: string } | null;
  /** avatar_url: the teacher's photo (a short-lived signed URL), on staff views only; null/absent = initials. */
  teacher: { id: string; display_name_ar: string; display_name_en?: string | null; tz: string; avatar_url?: string | null };
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  /** Copied onto the lesson at creation (R-LES-01), sent to the guardian (R-LES-02). */
  meeting_link: string | null;
  /**
   * The lesson's teacher holds it in our classroom (usesPlatform(teachers.meeting_mode, the academy
   * default), migration 490): clients hide the fixed link then. Absent in an old cache: the academy default.
   */
  platform_classroom?: boolean;
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

/** GET /teachers/me (R-TCH-03). */
export interface TeacherMe {
  id: string;
  display_name_ar: string;
  gender: Gender;
  programs: Program[];
  tz: string;
  meeting_link: string | null;
  /** teachers.meeting_mode as stored: null = the academy default (migration 490). */
  meeting_mode: TeacherMeetingMode | null;
  /**
   * usesPlatform(meeting_mode, settings.meeting_link_auto): the fixed link is not shown then. Absent in
   * a payload cached before migration 490: clients use the academy default.
   */
  platform_classroom?: boolean;
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
  /** usesPlatform(teachers.meeting_mode, settings.meeting_link_auto): the lessons go out with our classroom. */
  platform_classroom: boolean;
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
