import { driveFolderLink, sheetLink } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { parseManualLink, parseWindowDays } from './google-input';

const FOLDER = 'fake-folder-id-0001';
const SHEET = 'fake-sheet-id-00001';

describe('window days (7…180)', () => {
  it('accepts whole numbers in range only', () => {
    expect(parseWindowDays(' 60 ')).toBe(60);
    expect(parseWindowDays('7')).toBe(7);
    expect(parseWindowDays('180')).toBe(180);
    expect(parseWindowDays('6')).toBeNull();
    expect(parseWindowDays('181')).toBeNull();
    expect(parseWindowDays('30.5')).toBeNull();
    expect(parseWindowDays('')).toBeNull();
  });
});

describe('manual student folder link', () => {
  it('a folder link alone → folder id, no sheet', () => {
    expect(parseManualLink({ folder: driveFolderLink(FOLDER), sheet: ' ' })).toEqual({
      ok: true,
      body: { folder_id: FOLDER, attendance_sheet_id: null },
    });
  });

  it('a folder and a sheet link → both ids', () => {
    expect(parseManualLink({ folder: `${driveFolderLink(FOLDER)}?usp=sharing`, sheet: sheetLink(SHEET) })).toEqual({
      ok: true,
      body: { folder_id: FOLDER, attendance_sheet_id: SHEET },
    });
  });

  it('refuses a link with no folder id, or a sheet field that is not a spreadsheet', () => {
    expect(parseManualLink({ folder: 'https://example.test/nothing', sheet: '' })).toEqual({ ok: false, error: 'folder' });
    expect(parseManualLink({ folder: sheetLink(SHEET), sheet: '' })).toEqual({ ok: false, error: 'folder' });
    expect(parseManualLink({ folder: driveFolderLink(FOLDER), sheet: 'not a link' })).toEqual({ ok: false, error: 'sheet' });
  });
});
