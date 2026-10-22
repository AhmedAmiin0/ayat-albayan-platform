import { folderIdIn, GOOGLE_SKIP_REASONS, type GoogleSkipReason } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { colLetter, rowOf } from './a1-range';
import { attendanceRow, attendanceStats, matchDate } from './attendance-row';
import { contentHash } from './content-hash';
import { DriveFiles } from './drive-files';
import { GoogleData } from './google-data';
import { TZ } from './google-format';
import type { ItemResult, SyncItem } from './google-items.queries';
import { GoogleSyncSource } from './google-sync.source';
import { localDate } from './sheet-dates';
import { findSummaryRow, newSummaryRow, summaryUpdates } from './summary-row';
import { later, planned, synced, type ItemWriter, type WriteCtx } from './write-context';

const isSkipReason = (r: string | null): r is GoogleSkipReason => GOOGLE_SKIP_REASONS.some((x) => x === r);

/**
 * attendance_row and summary_row (docs/24 §2.5, §2.6). The attendance row is appended once, after
 * the PDF, unless the old script already has that student and date (`already_in_sheet`); our own
 * row is found again by its PDF link, never by a stored row number. The summary row is upserted:
 * matched by folder link then name, D..F recomputed from the attendance sheet.
 */
@Injectable()
export class SheetRowsWriter implements ItemWriter {
  constructor(
    private readonly source: GoogleSyncSource,
    private readonly drive: DriveFiles,
    private readonly data: GoogleData,
  ) {}

  write(item: SyncItem, ctx: WriteCtx): Promise<ItemResult> {
    return item.kind === 'summary_row' ? this.summary(item, ctx) : this.attendance(item, ctx);
  }

  private async attendance(item: SyncItem, ctx: WriteCtx): Promise<ItemResult> {
    const src = await this.source.report(item.subject_id);
    if (!src || !src.exportable) return { state: 'skipped', reason: 'not_platform_origin' };
    const date = localDate(src.startsAt, TZ);
    const pdf = await this.data.items.sibling({ kind: 'report_pdf', subjectId: item.subject_id });
    if (!ctx.live) return planned({ method: 'POST', target: 'sheet:attendance', summary: date });
    if (!pdf || pdf.state === 'pending') return later(item, 'pdf_not_synced');
    if (pdf.state === 'skipped' && isSkipReason(pdf.skip_reason)) return { state: 'skipped', reason: pdf.skip_reason };
    // failed / gone: wait for the PDF; its sync re-queues this row (GoogleSyncProcessor).
    if (pdf.state !== 'synced' || !pdf.google_id) return { state: 'failed', error: 'pdf_not_synced', attempts: item.attempts };
    const need = await this.drive.need(src.studentId);
    if (need.kind !== 'ready') return later(item, 'sheet_not_ready');
    const { google } = ctx;
    const sheetId = need.drive.sheetId;
    const values = attendanceRow({
      date, seq: src.seq, teacherName: src.teacherName, program: src.report.program ?? src.studentProgram, attendance: src.report.attendance,
      recited: src.report.recited, newMemorization: src.report.new_memorization, revision: src.report.revision, gradeOverall: src.report.grade_overall,
      notes: src.report.notes, homework: src.report.homework, meetingLink: src.meetingLink, pdfFileId: pdf.google_id,
    });
    const hash = contentHash(values);
    const rows = await google.readValues({ spreadsheetId: sheetId, range: 'A2:M', render: 'UNFORMATTED_VALUE' });
    const found = matchDate(rows, { date, pdfFileId: pdf.google_id });
    if (found.kind === 'script') return { state: 'skipped', reason: 'already_in_sheet' };
    if (found.kind === 'ours') {
      const range = `A${found.row}:M${found.row}`;
      if (hash !== item.content_hash) await google.updateValues({ spreadsheetId: sheetId, range, values: [values] });
      return synced({ googleId: range, parentId: sheetId, hash });
    }
    if (item.google_id) return { state: 'gone', error: 'row_deleted_in_google' };
    const { updatedRange } = await google.appendRow({ spreadsheetId: sheetId, range: 'A1', values });
    return synced({ googleId: updatedRange || null, parentId: sheetId, hash });
  }

  /** The PDF makes the sheet: wait while it is queued; else fail (its sync re-queues this row), never poll forever. */
  private async waitForSheet(item: SyncItem, reportId: string): Promise<ItemResult> {
    const pdf = await this.data.items.sibling({ kind: 'report_pdf', subjectId: reportId });
    if (pdf?.state === 'pending') return later(item, 'sheet_not_ready');
    return { state: 'failed', error: 'sheet_not_ready', attempts: item.attempts };
  }

  private async summary(item: SyncItem, ctx: WriteCtx): Promise<ItemResult> {
    const src = item.report_id ? await this.source.report(item.report_id) : null;
    if (!src || !src.exportable) return { state: 'skipped', reason: 'not_platform_origin' };
    const acct = await this.data.account.get();
    if (!acct.summary_sheet_id || !acct.drive_confirmed_at) return { state: 'skipped', reason: 'drive_unconfirmed' };
    const need = await this.drive.need(src.studentId);
    if (need.kind === 'unmapped') return { state: 'skipped', reason: 'student_unmapped' };
    if (!ctx.live) return planned({ method: 'PUT', target: `sheet:${acct.summary_sheet_id}`, summary: src.studentName });
    if (need.kind !== 'ready') return this.waitForSheet(item, src.reportId);
    const { google } = ctx;
    const summaryId = acct.summary_sheet_id;
    const att = await google.readValues({ spreadsheetId: need.drive.sheetId, range: 'A2:M', render: 'UNFORMATTED_VALUE' });
    const stats = attendanceStats(att);
    const student = { name: src.studentName, teacherName: src.teacherName, program: src.studentProgram, folderId: need.drive.folderId, attendanceSheetId: need.drive.sheetId };
    const rows = await google.readValues({ spreadsheetId: summaryId, range: 'A2:H', render: 'FORMULA' });
    const row = findSummaryRow(rows, student);
    const otherFolder = row !== null ? folderIdIn(rows[row - 2]?.[6]) : null;
    // A name match whose row points at ANOTHER folder is the script's student: never overwrite it.
    if (otherFolder && otherFolder !== student.folderId) return { state: 'failed', error: 'summary_row_other_folder', attempts: item.attempts };
    const hash = contentHash({ row, stats, student });
    if (row === null) {
      const { updatedRange } = await google.appendRow({ spreadsheetId: summaryId, range: 'A1', values: newSummaryRow(student, stats) });
      return synced({ googleId: updatedRange ? `A${rowOf(updatedRange) ?? ''}` : null, parentId: summaryId, hash });
    }
    if (hash !== item.content_hash) {
      for (const u of summaryUpdates(rows[row - 2] ?? [], student, stats)) {
        const end = colLetter(u.range.charCodeAt(0) - 65 + u.values.length - 1);
        await google.updateValues({ spreadsheetId: summaryId, range: `${u.range}${row}:${end}${row}`, values: [u.values] });
      }
    }
    return synced({ googleId: `A${row}`, parentId: summaryId, hash });
  }
}
