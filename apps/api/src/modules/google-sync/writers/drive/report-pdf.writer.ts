import { Injectable } from '@nestjs/common';
import { BUCKETS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { matchDate } from '../sheets/attendance-row';
import { contentHash } from '../calendar/content-hash';
import { DriveFiles } from './drive-files';
import { TZ } from '../../google-format';
import type { ItemResult, SyncItem } from '../../sync/google-items.queries';
import { GoogleSyncSource } from '../../sync/google-sync.source';
import { pdfName } from './pdf-name';
import { localDate } from '../sheets/sheet-dates';
import { later, planned, synced, type ItemWriter, type WriteCtx } from '../../sync/write-context';

/**
 * report_pdf (docs/24 §3, §2.5): the platform's report PDF into the student's Drive folder, named
 * «<student> — <date>.pdf» (« (المنصة)» when the old script already has that date in the sheet).
 * A re-rendered report replaces the content of the file WE uploaded (checked by appProperties);
 * a file someone deleted or trashed is `gone`.
 */
@Injectable()
export class ReportPdfWriter implements ItemWriter {
  constructor(
    private readonly source: GoogleSyncSource,
    private readonly drive: DriveFiles,
    private readonly storage: StorageService,
  ) {}

  async write(item: SyncItem, ctx: WriteCtx): Promise<ItemResult> {
    const src = await this.source.report(item.subject_id);
    if (!src || !src.exportable) return { state: 'skipped', reason: 'not_platform_origin' };
    if (!src.pdfReady || !src.pdfPath) return later(item, 'pdf_not_ready');
    const need = await this.drive.need(src.studentId);
    if (need.kind === 'unmapped') return { state: 'skipped', reason: 'student_unmapped' };
    if (need.kind === 'no_root') return { state: 'skipped', reason: 'drive_unconfirmed' };
    const date = localDate(src.startsAt, TZ);
    if (!ctx.live) {
      const target = need.kind === 'ready' ? `drive:${need.drive.folderId}` : 'drive:new-folder';
      return planned({ method: item.google_id ? 'PATCH' : 'POST', target, summary: pdfName({ student: src.studentName, date, alreadyInSheet: false }) });
    }
    const { google } = ctx;
    const place = await this.drive.ensure({ google, studentId: src.studentId, studentName: src.studentName });
    if (!place) return { state: 'skipped', reason: 'drive_unconfirmed' };
    const rows = await google.readValues({ spreadsheetId: place.sheetId, range: 'A2:M', render: 'UNFORMATTED_VALUE' });
    const name = pdfName({ student: src.studentName, date, alreadyInSheet: matchDate(rows, { date, pdfFileId: item.google_id }).kind === 'script' });
    const hash = contentHash({ version: src.version, name, folder: place.folderId });
    if (item.google_id) {
      const f = await google.getFile(item.google_id);
      if (!f || f.trashed) return { state: 'gone', error: 'deleted_in_google' };
      if (f.appProperties['ab_report_id'] !== src.reportId) return { state: 'failed', error: 'not_platform_file', attempts: item.attempts };
      if (hash === item.content_hash) return synced({ googleId: f.id, parentId: place.folderId, hash });
    }
    const bytes = await this.storage.download({ bucket: BUCKETS.reports, path: src.pdfPath });
    // Counted (backoff, 5 attempts), not `later`: a PDF lost in storage must not poll Google every 15 s forever.
    if (!bytes) throw new Error('pdf_missing_in_storage');
    if (item.google_id) {
      await google.updatePdf({ fileId: item.google_id, name, bytes });
      return synced({ googleId: item.google_id, parentId: place.folderId, hash });
    }
    const made = await google.uploadPdf({ name, parentId: place.folderId, bytes, appProperties: { ab_source: 'platform', ab_report_id: src.reportId } });
    return synced({ googleId: made.id, parentId: place.folderId, hash });
  }
}
