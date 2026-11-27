import type { GoogleStatusView, GoogleSyncItemView } from '..';

const AT = '2026-11-27T10:00:00.000Z';

export const aStatus = (): GoogleStatusView => ({
  configured: true,
  connection: {
    status: 'connected',
    email: 'academy@example.com',
    scopes: [],
    connected_at: AT,
    last_error: null,
  },
  settings: { enabled: true, mode: 'dry_run', window_days: 60 },
  redirect_uri: 'https://api.example.com/google/callback',
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
  drive: {
    root_folder_id: null,
    root_folder_name: null,
    summary_sheet_id: null,
    confirmed_at: null,
  },
  discovery: {
    at: AT,
    calendars: [{ id: 'c1@group.calendar.google.com', name: 'A' }],
    root_folder: null,
    summary_sheet: null,
  },
  counts: { pending: 1, synced: 2, gone: 0, failed: 0, skipped: 3 },
  warnings: { teacher_unmapped: 0, student_unmapped: 1, drive_unconfirmed: 0 },
  targets: { main_calendar: 'academy@example.com', teacher_calendars: [] },
  last_run_at: '2026-11-27T10:00:00.123456+00:00',
});

export const anItem = (): GoogleSyncItemView => ({
  id: '0b9f4a52-3c1e-4d7a-9a7e-2f1c3b4d5e6f',
  kind: 'report_pdf',
  state: 'skipped',
  skip_reason: 'dry_run',
  subject: 'Student · 2026-11-27',
  google_id: null,
  attempts: 1,
  last_error: null,
  planned: { method: 'POST', target: 'drive', summary: 'upload' },
  updated_at: AT,
});
