import type { Attendance, Gender, LessonStatus, Program, ReportStatus, StudentStatus } from '@ab/catalog';
import type { Conflict } from './conflicts';
import type { LessonEvent } from './state-machine';
import type { LessonTimeEditView, TimeEditMode } from './series/time-edit';
import type { TeacherMeetingMode } from '../classroom/meeting-mode';
import type { LessonRoomState } from '../classroom';
import type { LessonProposalView } from './proposals/proposals';

// API response shapes (docs/10-phase2-contracts.md §3): snake_case rows, ISO UTC, IANA tz.

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
  /** R-SUB-02: true on a future open lesson when the newest package is unpaid with nothing left. */
  unpaid?: boolean;
  /** The active makeup booked for this student's miss; others in a group may have none. */
  makeup?: { lesson_id: string; starts_at: string } | null;
  /** This student's lesson report, null before one is opened; edit window per docs/46 B7. */
  report?: { id: string; status: ReportStatus; submitted_at?: string | null;
    sent_at?: string | null; can_edit?: boolean; edit_until?: string | null } | null;
}

/** GET /lessons, /lessons/day, /teachers/me/lessons, /students/:id/lessons items. */
export interface LessonView {
  id: string;
  rule_id: string | null;
  /** The weekly rule's weekdays (0 = Sunday) in its zone; null for a one-off. */
  rule_byday?: number[] | null;
  /** The rule is a trial; a one-off move keeps it; absent in an old cache. */
  trial?: boolean;
  /** The assistant course its rule belongs to (schedule_rules.subscription_id). */
  course_subscription_id?: string | null;
  /** A makeup replaces a missed lesson and never consumes a package unit. */
  makeup?: boolean;
  makeup_of?: { id: string; starts_at: string } | null; // a makeup's missed lesson
  /** avatar_url: the teacher's photo (a short-lived signed URL), on staff views only; null/absent = initials. */
  teacher: {
    id: string;
    display_name_ar: string;
    display_name_en?: string | null;
    tz: string;
    avatar_url?: string | null;
  };
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  /** Settled by the job (or corrected since), no report since: staff may still correct it. */
  auto_held?: boolean;
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
  /** docs/46 D1: the teacher will attend; never the status; absent in an old cache. */
  teacher_confirmed_at?: string | null;
  rescheduled_from_id: string | null;
  /** The room opened early (joinWindow); an instant lesson never consumes a package. */
  room_opened_at?: string | null;
  room?: LessonRoomState | null; // who is in and the end-for-all stamp; null: nobody, not ended
  instant?: boolean;
  students: LessonStudentView[];
  /** allowedLessonEvents(status) minus what the caller's role may not do. */
  allowed_events: LessonEvent[];
  /**
   * Clashes found when the daily job / extend generated this lesson without an admin override
   * (R-SCH-04: e.g. a DST change moved it onto another lesson). [] = none.
   */
  conflicts: Conflict[];
  /** The teacher's or family's pending move request (R-SCH-08), null when none. */
  pending_proposal: LessonProposalView | null;
  /** R-SCH-11: what an admin may do to the time (null = nothing, and for teachers). */
  time_edit_mode?: TimeEditMode | null;
  /** The last in-place time edit (the time it replaced), null when never edited. */
  time_edit?: LessonTimeEditView | null;
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
  /** usesPlatform(meeting_mode, settings.meeting_link_auto): the fixed link is hidden then. Absent
   * in a payload cached before migration 490: clients use the academy default. */
  platform_classroom?: boolean;
  students: { id: string; code: string; name: string; tz: string; status: StudentStatus }[];
}

/** POST /booking 201. */
export interface BookingResult {
  rule_id: string;
  student_ids: string[];
  guardian_ids: string[];
  lessons: { id: string; starts_at: string; ends_at: string }[];
  /** Queued booking_confirmation* messages, one per guardian (docs/10 §5.11). */
  message_ids: string[];
  /** The stored invoice (null for a trial). */
  invoice_id: string | null;
}
