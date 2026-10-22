import { describe, expect, it } from 'vitest';
import { googleDriveSchema, googleSettingsSchema, googleStudentMapSchema, googleTeacherMapSchema } from './schemas.js';

const FILE = '1AbCdEfGhIjKlMnOpQrStUv';

describe('Google sync request schemas', () => {
  it('settings: only known fields, the two modes, the window in bounds', () => {
    expect(googleSettingsSchema.parse({ enabled: true, mode: 'live', window_days: 60 })).toEqual({ enabled: true, mode: 'live', window_days: 60 });
    expect(googleSettingsSchema.safeParse({ mode: 'write' }).success).toBe(false);
    expect(googleSettingsSchema.safeParse({ window_days: 3 }).success).toBe(false);
    expect(googleSettingsSchema.safeParse({ window_days: 181 }).success).toBe(false);
    expect(googleSettingsSchema.safeParse({ enabled: true, extra: 1 }).success).toBe(false);
  });

  it('teacher map: a calendar id (an email-like id) or null', () => {
    expect(googleTeacherMapSchema.parse({ calendar_id: 'abc123@group.calendar.google.com' }).calendar_id).toContain('@group');
    expect(googleTeacherMapSchema.parse({ calendar_id: null }).calendar_id).toBeNull();
    expect(googleTeacherMapSchema.safeParse({ calendar_id: 'a b' }).success).toBe(false);
    expect(googleTeacherMapSchema.safeParse({ calendar_id: '' }).success).toBe(false);
  });

  it('student map: folder + sheet, folder only, or both null (create new); never a sheet alone', () => {
    expect(googleStudentMapSchema.safeParse({ folder_id: FILE, attendance_sheet_id: FILE }).success).toBe(true);
    expect(googleStudentMapSchema.safeParse({ folder_id: FILE, attendance_sheet_id: null }).success).toBe(true);
    expect(googleStudentMapSchema.safeParse({ folder_id: null, attendance_sheet_id: null }).success).toBe(true);
    const bad = googleStudentMapSchema.safeParse({ folder_id: null, attendance_sheet_id: FILE });
    expect(bad.error?.issues[0]?.message).toBe('folder_required');
    expect(googleStudentMapSchema.safeParse({ folder_id: 'x/../y', attendance_sheet_id: null }).success).toBe(false);
  });

  it('drive: a root folder id, the summary sheet optional', () => {
    expect(googleDriveSchema.safeParse({ root_folder_id: FILE, summary_sheet_id: null }).success).toBe(true);
    expect(googleDriveSchema.safeParse({ root_folder_id: 'short', summary_sheet_id: null }).success).toBe(false);
  });
});
