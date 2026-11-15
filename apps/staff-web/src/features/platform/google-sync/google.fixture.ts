import { GOOGLE_SCOPES, type GoogleStatusView, type GoogleStudentMapRow, type GoogleSyncItemView, type GoogleTeacherMapRow } from '@ab/shared';

// Test fixture (not app code): obviously fake ids and names, never a real Google id or person.

const AT = '2026-10-22T08:00:00Z';
export const FAKE_FOLDER = 'fake-folder-id-0001';
export const FAKE_SHEET = 'fake-sheet-id-00001';

export function googleStatus(over: Partial<GoogleStatusView> = {}): GoogleStatusView {
  return {
    configured: true,
    connection: { status: 'connected', email: 'academy@example.test', scopes: [...GOOGLE_SCOPES], connected_at: AT, last_error: null },
    settings: { enabled: true, mode: 'dry_run', window_days: 60 },
    redirect_uri: 'http://localhost:3000/integrations/google/callback',
    scopes: GOOGLE_SCOPES,
    drive: { root_folder_id: null, root_folder_name: null, summary_sheet_id: null, confirmed_at: null },
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
      teacher_id: 'teacher-1',
      name: 'Teacher A',
      calendar_id: null,
      calendar_name: null,
      confirmed_at: null,
      suggestion: { id: 'fake-cal-a@group.calendar.example', name: 'Calendar Teacher A' },
    },
    { teacher_id: 'teacher-2', name: 'Teacher B', calendar_id: null, calendar_name: null, confirmed_at: null, suggestion: null },
  ];
}

export function googleStudents(): GoogleStudentMapRow[] {
  return [
    {
      student_id: 'student-1',
      code: 'AB-0001',
      name: 'Student One',
      folder_id: null,
      attendance_sheet_id: null,
      create_new: false,
      confirmed_at: null,
      suggestion: { folder_id: FAKE_FOLDER, attendance_sheet_id: FAKE_SHEET, name: 'Student One' },
    },
    {
      student_id: 'student-2',
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
  const base = { google_id: null, attempts: 1, last_error: null, planned: null, updated_at: AT, skip_reason: null } as const;
  return [
    { ...base, id: 'item-1', kind: 'teacher_event', state: 'failed', subject: 'Student One 2026-10-22', last_error: 'HTTP 500' },
    {
      ...base,
      id: 'item-2',
      kind: 'main_event',
      state: 'skipped',
      skip_reason: 'dry_run',
      subject: 'Student Two 2026-10-23',
      planned: { method: 'POST', target: 'calendar/main', summary: 'insert event' },
    },
    { ...base, id: 'item-3', kind: 'report_pdf', state: 'synced', subject: 'Student One 2026-10-21' },
  ];
}
