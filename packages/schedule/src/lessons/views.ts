import type { Gender, Program, StudentStatus } from '@ab/catalog';
import type { Conflict } from './conflicts';
import type { TeacherMeetingMode } from '../classroom/meeting-mode';

// API response shapes (docs/10-phase2-contracts.md §3): snake_case rows, ISO UTC, IANA tz.

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
  /** The stored invoice (null for a trial). */
  invoice_id: string | null;
}
