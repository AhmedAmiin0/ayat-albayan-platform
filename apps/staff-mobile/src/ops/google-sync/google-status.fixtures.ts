import type { GoogleStatusView } from '@ab/shared';

/** A connected account, sync on, live, two pending (test fixture for the Google card). */
export const googleLive: GoogleStatusView = {
  configured: true,
  connection: {
    status: 'connected',
    email: 'academy@example.com',
    scopes: [],
    connected_at: '2026-10-01T08:00:00Z',
    last_error: null,
  },
  settings: { enabled: true, mode: 'live', window_days: 30 },
  redirect_uri: 'http://localhost:3000/admin/google/callback',
  scopes: [],
  drive: { root_folder_id: null, root_folder_name: null, summary_sheet_id: null, confirmed_at: null },
  discovery: null,
  counts: { pending: 2, synced: 10, gone: 0, failed: 1, skipped: 0 },
  warnings: { teacher_unmapped: 0, student_unmapped: 0, drive_unconfirmed: 0 },
  targets: { main_calendar: 'main', teacher_calendars: [] },
  last_run_at: null,
};

/** Disconnected after an error, sync off, dry run. */
export const googleDryRunError: GoogleStatusView = {
  ...googleLive,
  connection: { ...googleLive.connection, status: 'disconnected', email: null, last_error: 'invalid_grant' },
  settings: { enabled: false, mode: 'dry_run', window_days: 30 },
  counts: { pending: 0, synced: 0, gone: 0, failed: 4, skipped: 0 },
};
