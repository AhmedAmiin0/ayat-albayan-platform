import {
  GOOGLE_SCOPES,
  type GoogleStatusView,
  type GoogleStudentMapRow,
  type GoogleSyncItemView,
  type GoogleTeacherMapRow,
} from '@ab/catalog';

// Test fixture (not app code): obviously fake ids and names, never a real Google id or person.

const AT = '2026-10-22T08:00:00Z';
export const FAILING_ITEM_ID = '0b9f4a52-3c1e-4d7a-9a7e-2f1c3b4d5e61';
export const TEACHER_A = '7f3a4b5c-6d7e-4f80-9a12-b3c4d5e6f701';
export const TEACHER_B = '7f3a4b5c-6d7e-4f80-9a12-b3c4d5e6f702';
export const STUDENT_ONE = '8a4b5c6d-7e8f-4a91-8b23-c4d5e6f70801';
export const STUDENT_TWO = '8a4b5c6d-7e8f-4a91-8b23-c4d5e6f70802';
export const FAKE_FOLDER = 'fake-folder-id-0001';
export const FAKE_SHEET = 'fake-sheet-id-00001';

export function googleStatus(over: Partial<GoogleStatusView> = {}): GoogleStatusView {
  return {
    configured: true,
    connection: { status: 'connected', email: 'academy@example.test', scopes: [...GOOGLE_SCOPES], connected_at: AT, last_error: null },
    settings: { enabled: true, mode: 'dry_run', window_days: 60 },
    redirect_uri: 'http://localhost:3000/integrations/google/callback',
    scopes: GOOGLE_SCOPES,
    drive: {
      root_folder_id: null,
      root_folder_name: null,
      summary_sheet_id: null,
      confirmed_at: null,
    },
    discovery: {
      at: AT,
      calendars: [
        { id: 'fake-cal-a@group.calendar.example', name: 'Calendar Teacher A' },
        { id: 'fake-cal-b@group.calendar.example', name: 'Calendar Teacher B' },
      ],
      root_folder: { id: 'fake-root-folder-0001', name: 'Root Reports Folder' },
      summary_sheet: { id: 'fake-summary-sheet-01', name: 'Summary Sheet' },
    },
    counts: { pending: 2, synced: 5, gone: 0, failed: 1, skipped: 3 },
    warnings: { teacher_unmapped: 1, student_unmapped: 2, drive_unconfirmed: 0 },
    targets: { main_calendar: 'Main Academy Calendar', teacher_calendars: ['Calendar Teacher A', 'Calendar Teacher B'] },
    last_run_at: AT,
    ...over,
  };
}

export function googleTeachers(): GoogleTeacherMapRow[] {
  return [
    {
      teacher_id: TEACHER_A,
      name: 'Teacher A',
      calendar_id: null,
      calendar_name: null,
      confirmed_at: null,
      suggestion: { id: 'fake-cal-a@group.calendar.example', name: 'Calendar Teacher A' },
    },
    { teacher_id: TEACHER_B, name: 'Teacher B', calendar_id: null, calendar_name: null, confirmed_at: null, suggestion: null },
  ];
}

export function googleStudents(): GoogleStudentMapRow[] {
  return [
    {
      student_id: STUDENT_ONE,
      code: 'AB-0001',
      name: 'Student One',
      folder_id: null,
      attendance_sheet_id: null,
      create_new: false,
      confirmed_at: null,
      suggestion: { folder_id: FAKE_FOLDER, attendance_sheet_id: FAKE_SHEET, name: 'Student One' },
    },
    {
      student_id: STUDENT_TWO,
      code: 'AB-0002',
      name: 'Student Two',
      folder_id: FAKE_FOLDER,
      attendance_sheet_id: null,
      create_new: false,
      confirmed_at: AT,
      suggestion: null,
    },
  ];
}

export function googleItems(): GoogleSyncItemView[] {
  const base = {
    google_id: null,
    attempts: 1,
    last_error: null,
    planned: null,
    updated_at: AT,
    skip_reason: null,
  } as const;
  return [
    { ...base, id: FAILING_ITEM_ID, kind: 'teacher_event', state: 'failed', subject: 'Student One 2026-10-22', last_error: 'HTTP 500' },
    {
      ...base,
      id: '0b9f4a52-3c1e-4d7a-9a7e-2f1c3b4d5e62',
      kind: 'main_event',
      state: 'skipped',
      skip_reason: 'dry_run',
      subject: 'Student Two 2026-10-23',
      planned: { method: 'POST', target: 'calendar/main', summary: 'insert event' },
    },
    { ...base, id: '0b9f4a52-3c1e-4d7a-9a7e-2f1c3b4d5e63', kind: 'report_pdf', state: 'synced', subject: 'Student One 2026-10-21' },
  ];
}
