import { fileIdIn, folderIdIn, GOOGLE_WINDOW_DAYS, type GoogleStudentMapInput } from '@ab/shared';

// The admin's typed input of the Google section, checked before anything is sent.

/** A whole number of days in [7, 180], or null. */
export function parseWindowDays(text: string): number | null {
  const v = text.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return n >= GOOGLE_WINDOW_DAYS.min && n <= GOOGLE_WINDOW_DAYS.max ? n : null;
}

export type ManualLink = { ok: true; body: GoogleStudentMapInput } | { ok: false; error: 'folder' | 'sheet' };

/**
 * A pasted Drive folder link (+ an optional spreadsheet link) → the PUT body. A link that holds no
 * folder id is refused (never sent as a guess); an empty sheet field means «no attendance sheet».
 */
export function parseManualLink(input: { folder: string; sheet: string }): ManualLink {
  const folderId = folderIdIn(input.folder.trim());
  if (!folderId) return { ok: false, error: 'folder' };
  const sheetText = input.sheet.trim();
  if (sheetText === '') return { ok: true, body: { folder_id: folderId, attendance_sheet_id: null } };
  const sheetId = fileIdIn(sheetText);
  if (!sheetId) return { ok: false, error: 'sheet' };
  return { ok: true, body: { folder_id: folderId, attendance_sheet_id: sheetId } };
}

/** The teacher picker's «بدون تقويم» value (a calendar id never contains a space). */
export const NO_CALENDAR = 'none ';
