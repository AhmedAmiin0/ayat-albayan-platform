import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import type { DriveFiles } from './drive-files';
import { FakeGoogle } from '../../http/google-client.fake';
import type { GoogleData } from '../../google-data';
import type { GoogleSyncSource } from '../../sync/google-sync.source';
import { fakeData, item, REPORT_ID, reportSource, STUDENT_ID } from '../../google-sync.fakes';
import { ReportPdfWriter } from './report-pdf.writer';
import { SheetRowsWriter } from '../sheets/sheet-rows.writer';

// No endless 15-second polling: a wait that can never end becomes a counted retry or a failure.

function setup(need: object) {
  const google = new FakeGoogle();
  const data = fakeData();
  const source = { report: vi.fn().mockResolvedValue(reportSource()) };
  const drive = { need: vi.fn().mockResolvedValue(need), ensure: vi.fn().mockResolvedValue({ folderId: 'F', sheetId: 'S' }) };
  google.sheets.set('S', []);
  const storage = { download: vi.fn().mockResolvedValue(null) };
  const pdf = new ReportPdfWriter(source as unknown as GoogleSyncSource, drive as unknown as DriveFiles, storage as unknown as StorageService);
  const rows = new SheetRowsWriter(source as unknown as GoogleSyncSource, drive as unknown as DriveFiles, data as unknown as GoogleData);
  return { pdf, rows, data, ctx: { live: true as const, google } };
}

describe('waits that cannot end', () => {
  it('a PDF missing in storage throws (counted retry, then failed), not `later`', async () => {
    const s = setup({ kind: 'ready', drive: { folderId: 'F', sheetId: 'S' } });
    await expect(s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID }), s.ctx)).rejects.toThrow('pdf_missing_in_storage');
  });

  it('the summary row waits for a queued PDF, but fails (re-queued by the PDF) when the PDF is not coming', async () => {
    const s = setup({ kind: 'create', folder: true, sheet: true, rootId: 'R' });
    const sum = () => s.rows.write(item({ kind: 'summary_row', subject_id: STUDENT_ID, report_id: REPORT_ID }), s.ctx);
    s.data.items.sibling.mockResolvedValue({ state: 'pending', google_id: null, google_parent_id: null, skip_reason: null });
    expect(await sum()).toMatchObject({ state: 'retry', error: 'sheet_not_ready' });
    s.data.items.sibling.mockResolvedValue({ state: 'failed', google_id: null, google_parent_id: null, skip_reason: null });
    expect(await sum()).toMatchObject({ state: 'failed', error: 'sheet_not_ready' });
    expect(s.data.items.sibling).toHaveBeenCalledWith({ kind: 'report_pdf', subjectId: REPORT_ID });
  });
});
