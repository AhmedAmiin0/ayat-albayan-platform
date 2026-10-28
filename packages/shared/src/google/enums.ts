// Google Calendar + Drive + Sheets sync alongside the old Apps Script (docs/24, owner 2026-10-22).
// One way only, platform → Google, into the SAME calendars, folders and sheets the script uses.
import type { Enums } from '@ab/db';

/** google_sync_items.kind: one mirrored object each (docs/24 §3). */
export const GOOGLE_SYNC_KINDS = ['teacher_event', 'main_event', 'report_pdf', 'attendance_row', 'summary_row'] as const satisfies readonly Enums<'google_sync_kind'>[];
export type GoogleSyncKind = (typeof GOOGLE_SYNC_KINDS)[number];

/** google_sync_items.state: the outbox's states. `gone` = deleted by someone in Google; never recreated by itself. */
export const GOOGLE_SYNC_STATES = ['pending', 'synced', 'gone', 'failed', 'skipped'] as const satisfies readonly Enums<'google_sync_state'>[];
export type GoogleSyncState = (typeof GOOGLE_SYNC_STATES)[number];

/** settings.google_sync_mode: `dry_run` records the planned request and writes nothing in Google. */
export const GOOGLE_SYNC_MODES = ['dry_run', 'live'] as const;
export type GoogleSyncMode = (typeof GOOGLE_SYNC_MODES)[number];

/** Why an item was skipped (google_sync_items.skip_reason). */
export const GOOGLE_SKIP_REASONS = [
  'dry_run',
  'teacher_unmapped',
  'student_unmapped',
  'drive_unconfirmed',
  'already_in_sheet',
  /** Queued, then found to be an imported lesson (an import ran while sync was on): never written. */
  'not_platform_origin',
  /** An imported lesson's slot already holds the old script's event: not written, tried again on the next sweep. */
  'script_event_present',
] as const;
export type GoogleSkipReason = (typeof GOOGLE_SKIP_REASONS)[number];

/**
 * teachers.calendar_owner (docs/24 «نقل تقويم معلم إلى المنصة»): who builds the teacher's Google Calendar.
 * 'script' (default) = the old Apps Script from the bookings sheet; 'platform' = every lesson of the teacher.
 */
export const TEACHER_CALENDAR_OWNERS = ['script', 'platform'] as const;
export type TeacherCalendarOwner = (typeof TEACHER_CALENDAR_OWNERS)[number];

/** google_account.status. */
export const GOOGLE_ACCOUNT_STATUSES = ['disconnected', 'connected', 'error'] as const;
export type GoogleAccountStatus = (typeof GOOGLE_ACCOUNT_STATUSES)[number];

/**
 * The OAuth scopes the owner grants once (docs/24 §3): events, Drive files, sheets, the account's email,
 * plus the read-only calendar list (discovery of the «آيات البيان — …» calendars needs it; events alone cannot list them).
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'openid',
  'email',
] as const;

/** The production callback, registered by the owner in the Google Cloud OAuth client (docs/24 §3). */
export const GOOGLE_REDIRECT_URI_PRODUCTION = 'https://api.ayatalbayan.com/integrations/google/callback';

/** settings.google_calendar_window_days bounds (default 60). */
export const GOOGLE_WINDOW_DAYS = { min: 7, max: 180, default: 60 } as const;
