import type { TeacherCalendarOwner } from './enums';
import type { GoogleFound } from './status.schemas';

/** GET /admin/google/teachers: one row per active teacher. */
export interface GoogleTeacherMapRow {
  teacher_id: string;
  name: string;
  calendar_id: string | null;
  calendar_name: string | null;
  confirmed_at: string | null;
  /** Matched by name from the last discovery. */
  suggestion: GoogleFound | null;
}

/** GET /admin/google/students: one row per trial/active student. */
export interface GoogleStudentMapRow {
  student_id: string;
  code: string;
  name: string;
  folder_id: string | null;
  attendance_sheet_id: string | null;
  /** Confirmed with no folder: the platform creates folder and sheet on the first report. */
  create_new: boolean;
  confirmed_at: string | null;
  /** From the summary sheet, matched by normalised Arabic name. */
  suggestion: { folder_id: string; attendance_sheet_id: string | null; name: string } | null;
}

/** GET /admin/google/teachers/:id/calendar-owner: who builds the teacher's calendar, and how its events fare. */
export interface TeacherCalendarView {
  teacher_id: string;
  owner: TeacherCalendarOwner;
  changed_at: string | null;
  /** This teacher's teacher-calendar items the platform wrote (synced). */
  managed: number;
  /** Items not written because the old script's event is still there (skip_reason script_event_present). */
  script_event_present: number;
}
