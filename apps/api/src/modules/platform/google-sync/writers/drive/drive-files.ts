import { Injectable } from '@nestjs/common';
import { GoogleAccountQueries } from '../../oauth/google-account.queries';
import type { GoogleClient } from '../../google-client.port';
import { ATTENDANCE_HEADER, MIME } from '../../google-format';
import { GoogleMapQueries } from '../../map/google-map.queries';
import { attendanceSheetName, studentFolderName } from './pdf-name';
import { brandStyle } from '../sheets/sheet-style';

/** A confirmed student's folder and attendance sheet; `null` = not confirmed / no Drive root. */
type StudentDrive = { folderId: string; sheetId: string };
type DriveNeed = { kind: 'ready'; drive: StudentDrive } | { kind: 'create'; folder: boolean; sheet: boolean; rootId: string | null } | { kind: 'unmapped' } | { kind: 'no_root' };

/**
 * The student's Drive place (docs/24 §3): the admin-confirmed folder and sheet, or — confirmed as
 * «مجلد جديد» — a folder «<student>» under the confirmed root and «سجل حضور — <student>» with the
 * header and the Brand styling. Each new id is recorded at once, so a retry never makes a twin.
 */
@Injectable()
export class DriveFiles {
  constructor(
    private readonly map: GoogleMapQueries,
    private readonly account: GoogleAccountQueries,
  ) {}

  async need(studentId: string): Promise<DriveNeed> {
    const files = await this.map.files(studentId);
    if (!files) return { kind: 'unmapped' };
    if (files.folder_id && files.attendance_sheet_id) return { kind: 'ready', drive: { folderId: files.folder_id, sheetId: files.attendance_sheet_id } };
    if (files.folder_id) return { kind: 'create', folder: false, sheet: true, rootId: null };
    const acct = await this.account.get();
    if (!acct.root_folder_id || !acct.drive_confirmed_at) return { kind: 'no_root' };
    return { kind: 'create', folder: true, sheet: true, rootId: acct.root_folder_id };
  }

  /** Live only: makes what is missing and returns the place. */
  async ensure(input: { google: GoogleClient; studentId: string; studentName: string }): Promise<StudentDrive | null> {
    const { google, studentId, studentName } = input;
    const need = await this.need(studentId);
    if (need.kind === 'ready') return need.drive;
    if (need.kind !== 'create') return null;
    const files = await this.map.files(studentId);
    let folderId = files?.folder_id ?? null;
    if (!folderId && need.rootId) {
      folderId = (await google.createFolder({ name: studentFolderName(studentName), parentId: need.rootId })).id;
      await this.map.recordCreated({ studentId, patch: { folder_id: folderId } });
    }
    if (!folderId) return null;
    if (!need.folder) {
      // An existing (script) folder without a confirmed sheet: use its «سجل حضور — …», never a twin.
      const found = await google.findFiles({ name: attendanceSheetName(studentName), parentId: folderId, mimeType: MIME.sheet });
      if (found.length > 1) return null;
      if (found[0]) {
        await this.map.recordSheet({ studentId, sheetId: found[0].id });
        return { folderId, sheetId: found[0].id };
      }
    }
    const sheetId = (await google.createSpreadsheet({ name: attendanceSheetName(studentName), parentId: folderId })).id;
    await this.map.recordCreated({ studentId, patch: { attendance_sheet_id: sheetId } });
    await google.updateValues({ spreadsheetId: sheetId, range: 'A1:M1', values: [[...ATTENDANCE_HEADER]] });
    await google.batchUpdate({ spreadsheetId: sheetId, requests: brandStyle(ATTENDANCE_HEADER.length) });
    return { folderId, sheetId };
  }
}
