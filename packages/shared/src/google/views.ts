import type { GoogleAccountStatus, GoogleSkipReason, GoogleSyncKind, GoogleSyncMode, GoogleSyncState, TeacherCalendarOwner } from './enums.js';

/** The connected academy account (google_account): never a token. */
export interface GoogleConnectionView {
  status: GoogleAccountStatus;
  email: string | null;
  scopes: string[];
  connected_at: string | null;
  last_error: string | null;
}

/** settings.google_sync_enabled / google_sync_mode / google_calendar_window_days. */
export interface GoogleSyncSettings {
  enabled: boolean;
  mode: GoogleSyncMode;
  window_days: number;
}

/** The Drive root «تقارير آيات البيان» and the summary sheet «سجل الطلاب المشتركين», once an admin confirmed them. */
export interface GoogleDriveView {
  root_folder_id: string | null;
  root_folder_name: string | null;
  summary_sheet_id: string | null;
  confirmed_at: string | null;
}

/** One calendar or file found by discovery (POST /admin/google/discover). */
export interface GoogleFound {
  id: string;
  name: string;
}

/** What discovery found, kept on google_account until the next discovery. */
export interface GoogleDiscoveryView {
  at: string;
  calendars: GoogleFound[];
  root_folder: GoogleFound | null;
  summary_sheet: GoogleFound | null;
}

/** GET /admin/google/status (admin; the mobile card reads it too). */
export interface GoogleStatusView {
  /** GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set («التكاملات»). */
  configured: boolean;
  connection: GoogleConnectionView;
  settings: GoogleSyncSettings;
  /** Exactly what the owner registers in the Google Cloud OAuth client. */
  redirect_uri: string;
  scopes: readonly string[];
  drive: GoogleDriveView;
  discovery: GoogleDiscoveryView | null;
  counts: Record<GoogleSyncState, number>;
  /** Items skipped because a teacher or a student is not mapped yet. */
  warnings: { teacher_unmapped: number; student_unmapped: number; drive_unconfirmed: number };
  /** For the «كتابة فعلية» confirmation: the calendars it will write into. */
  targets: { main_calendar: string; teacher_calendars: string[] };
  last_run_at: string | null;
}

/** GET /admin/google/teachers: one row per active teacher. */
export interface GoogleTeacherMapRow {
  teacher_id: string;
  name: string;
  calendar_id: string | null;
  calendar_name: string | null;
  confirmed_at: string | null;
  /** By name, from the last discovery: «آيات البيان — <teacher>». */
  suggestion: GoogleFound | null;
}

/** GET /admin/google/students: one row per trial/active student. */
export interface GoogleStudentMapRow {
  student_id: string;
  code: string;
  name: string;
  folder_id: string | null;
  attendance_sheet_id: string | null;
  /** Confirmed with no folder: the platform creates «<student>» and «سجل حضور — <student>» on the first report. */
  create_new: boolean;
  confirmed_at: string | null;
  /** From the summary sheet, matched by normalised Arabic name. */
  suggestion: { folder_id: string; attendance_sheet_id: string | null; name: string } | null;
}

/** dry_run: the request the live mode would send (never a token, never a file body). */
export interface GooglePlannedRequest {
  method: string;
  target: string;
  summary: string;
}

/** GET /admin/google/items: the last 100 sync items, newest first. */
export interface GoogleSyncItemView {
  id: string;
  kind: GoogleSyncKind;
  state: GoogleSyncState;
  skip_reason: GoogleSkipReason | null;
  /** Who/what it is about: the student's name and the lesson or report date. */
  subject: string;
  google_id: string | null;
  attempts: number;
  last_error: string | null;
  planned: GooglePlannedRequest | null;
  updated_at: string;
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
