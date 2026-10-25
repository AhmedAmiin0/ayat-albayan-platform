import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { DriveFiles } from './drive-files';
import type { ItemResult } from '../../sync/google-items.queries';
import { SUMMARY_HEADER } from '../../google-format';
import type { GoogleAccountQueries } from '../../oauth/google-account.queries';
import { FakeGoogle } from '../../http/google-client.fake';
import type { GoogleData } from '../../google-data';
import type { GoogleMapQueries, StudentFiles } from '../../map/google-map.queries';
import type { GoogleSyncSource } from '../../sync/google-sync.source';
import { fakeData, item, REPORT_ID, reportSource, STUDENT_ID } from '../../google-sync.fakes';
import { ReportPdfWriter } from './report-pdf.writer';
import { SheetRowsWriter } from '../sheets/sheet-rows.writer';

const ROOT = 'Root_ABCDEFGHIJ';
const SUMMARY = 'Summary_ABCDEFGHIJ';

function setup(files: StudentFiles | null) {
  const google = new FakeGoogle();
  google.sheets.set(SUMMARY, [[...SUMMARY_HEADER]]);
  let mapped = files;
  const map = {
    files: vi.fn(async () => mapped),
    recordCreated: vi.fn(async ({ patch }: { patch: Partial<StudentFiles> }) => void (mapped = { ...(mapped as StudentFiles), ...patch })),
    recordSheet: vi.fn(async ({ sheetId }: { sheetId: string }) => void (mapped = { ...(mapped as StudentFiles), attendance_sheet_id: sheetId })),
  };
  const data = fakeData();
  const drive = new DriveFiles(map as unknown as GoogleMapQueries, data.account as unknown as GoogleAccountQueries);
  const source = { report: vi.fn().mockResolvedValue(reportSource()) };
  const storage = { download: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])) };
  const pdf = new ReportPdfWriter(source as unknown as GoogleSyncSource, drive, storage as unknown as StorageService);
  const rows = new SheetRowsWriter(source as unknown as GoogleSyncSource, drive, data as unknown as GoogleData);
  return { google, pdf, rows, data, source, map, ctx: { live: true as const, google } };
}
const NEW = { folder_id: null, attendance_sheet_id: null, summary_row_hint: null };

describe('report PDF + attendance + summary (docs/24 §3, §2.5, §2.6)', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => (s = setup(NEW)));

  async function runAll() {
    const pdf = await s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID, report_id: REPORT_ID }), s.ctx);
    if (pdf.state !== 'synced') throw new Error(`pdf ${pdf.state}`);
    s.data.items.sibling.mockResolvedValue({ state: 'synced', google_id: pdf.googleId, google_parent_id: pdf.parentId });
    const att = await s.rows.write(item({ kind: 'attendance_row', subject_id: REPORT_ID, report_id: REPORT_ID }), s.ctx);
    const sum = await s.rows.write(item({ kind: 'summary_row', subject_id: STUDENT_ID, report_id: REPORT_ID }), s.ctx);
    return { pdf, att, sum };
  }

  it('a confirmed «new folder» student: folder + styled sheet created and recorded, PDF, 13-column row, summary row', async () => {
    const { pdf, att, sum } = await runAll();
    const folder = [...s.google.files.values()].find((f) => f.name === 'طالب تجربة');
    expect(folder?.parentId).toBe(ROOT);
    const sheet = [...s.google.files.values()].find((f) => f.name === 'سجل حضور — طالب تجربة');
    expect(s.map.recordCreated).toHaveBeenCalledTimes(2);
    expect(s.google.files.get(pdf.state === 'synced' ? (pdf.googleId ?? '') : '')).toMatchObject({ name: 'طالب تجربة — 2026-10-21.pdf', appProperties: { ab_source: 'platform', ab_report_id: REPORT_ID } });
    const rows = s.google.sheets.get(sheet?.id ?? '') ?? [];
    expect(rows[0]).toHaveLength(13);
    expect(rows[1]?.[0]).toBe('2026-10-21');
    expect(att).toMatchObject({ state: 'synced' });
    expect(s.google.log.some((l) => l.startsWith('batchUpdate'))).toBe(true);
    expect(sum).toMatchObject({ state: 'synced', googleId: 'A2' });
    expect(s.google.sheets.get(SUMMARY)?.[1]?.slice(3, 6)).toEqual(['2026-10-21', '2026-10-21', 1]);
  });

  it('the old script already has that date: PDF « (المنصة)», no second attendance row', async () => {
    s = setup({ folder_id: 'Folder_ABCDEFGHIJ', attendance_sheet_id: 'Sheet_ABCDEFGHIJ', summary_row_hint: null });
    s.google.files.set('Folder_ABCDEFGHIJ', { id: 'Folder_ABCDEFGHIJ', name: 'طالب تجربة', mimeType: 'folder', trashed: false, appProperties: {}, parentId: ROOT });
    s.google.sheets.set('Sheet_ABCDEFGHIJ', [['تاريخ الحلقة'], ['2026-10-21', 4, '', '', '', '', '', '', '', '', '', '', 'https://drive.google.com/file/d/Script_ABCDEFGHIJ/view']]);
    const { pdf, att } = await runAll();
    expect(s.google.files.get(pdf.state === 'synced' ? (pdf.googleId ?? '') : '')?.name).toBe('طالب تجربة — 2026-10-21 (المنصة).pdf');
    expect(att).toEqual({ state: 'skipped', reason: 'already_in_sheet' });
    expect(s.google.sheets.get('Sheet_ABCDEFGHIJ')).toHaveLength(2);
  });

  it('runs twice: no second PDF, row or summary row (idempotent)', async () => {
    const first = await runAll();
    const stamp = (r: ItemResult) => (r.state === 'synced' ? { google_id: r.googleId, content_hash: r.hash, google_parent_id: r.parentId } : {});
    await s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID, report_id: REPORT_ID, ...stamp(first.pdf) }), s.ctx);
    await s.rows.write(item({ kind: 'attendance_row', subject_id: REPORT_ID, report_id: REPORT_ID, ...stamp(first.att) }), s.ctx);
    await s.rows.write(item({ kind: 'summary_row', subject_id: STUDENT_ID, report_id: REPORT_ID, ...stamp(first.sum) }), s.ctx);
    expect([...s.google.files.values()].filter((f) => f.name.endsWith('.pdf'))).toHaveLength(1);
    expect(s.google.log.filter((l) => l.startsWith('appendRow'))).toHaveLength(2);
    expect(s.google.log.filter((l) => l.startsWith('updatePdf'))).toHaveLength(0);
  });

  it('a summary row that already exists (matched by name) is updated, not appended', async () => {
    s.google.sheets.set(SUMMARY, [[...SUMMARY_HEADER], ['  طالب تجربه ', 'Script teacher', 'X', '2026-01-01', '2026-02-01', 9, '', '']]);
    await runAll();
    const rows = s.google.sheets.get(SUMMARY) ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[1]?.slice(0, 6)).toEqual(['  طالب تجربه ', 'Script teacher', 'X', '2026-10-21', '2026-10-21', 1]);
    expect(String(rows[1]?.[6])).toContain('/folders/');
  });

  it('unconfirmed student or Drive root: skipped, nothing in Google; imported reports never exported', async () => {
    s = setup(null);
    expect(await s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID }), s.ctx)).toEqual({ state: 'skipped', reason: 'student_unmapped' });
    s = setup(NEW);
    s.data.account.get.mockResolvedValue({ root_folder_id: null, drive_confirmed_at: null });
    expect(await s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID }), s.ctx)).toEqual({ state: 'skipped', reason: 'drive_unconfirmed' });
    s.source.report.mockResolvedValue(reportSource({ exportable: false }));
    expect(await s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID }), s.ctx)).toEqual({ state: 'skipped', reason: 'not_platform_origin' });
    expect(s.google.log).toEqual([]);
  });

  it('a confirmed script folder without a sheet id: its own «سجل حضور» is found and used, never a twin', async () => {
    s = setup({ folder_id: 'Folder_ABCDEFGHIJ', attendance_sheet_id: null, summary_row_hint: null });
    s.google.files.set('Sheet_ABCDEFGHIJ', { id: 'Sheet_ABCDEFGHIJ', name: 'سجل حضور — طالب تجربة', mimeType: 'application/vnd.google-apps.spreadsheet', trashed: false, appProperties: {}, parentId: 'Folder_ABCDEFGHIJ' });
    s.google.sheets.set('Sheet_ABCDEFGHIJ', [['تاريخ الحلقة']]);
    await runAll();
    expect(s.google.log.some((l) => l.startsWith('createSpreadsheet'))).toBe(false);
    expect(s.map.recordSheet).toHaveBeenCalledWith({ studentId: STUDENT_ID, sheetId: 'Sheet_ABCDEFGHIJ' });
    expect(s.google.sheets.get('Sheet_ABCDEFGHIJ')).toHaveLength(2);
  });

  it('the attendance row waits for its PDF, mirrors its skip, and fails (not lost) when the PDF failed', async () => {
    const att = () => s.rows.write(item({ kind: 'attendance_row', subject_id: REPORT_ID, report_id: REPORT_ID }), s.ctx);
    s.data.items.sibling.mockResolvedValue({ state: 'pending', google_id: null, google_parent_id: null, skip_reason: null });
    expect(await att()).toMatchObject({ state: 'retry', error: 'pdf_not_synced' });
    s.data.items.sibling.mockResolvedValue({ state: 'skipped', google_id: null, google_parent_id: null, skip_reason: 'drive_unconfirmed' });
    expect(await att()).toEqual({ state: 'skipped', reason: 'drive_unconfirmed' });
    s.data.items.sibling.mockResolvedValue({ state: 'failed', google_id: null, google_parent_id: null, skip_reason: null });
    expect(await att()).toMatchObject({ state: 'failed', error: 'pdf_not_synced' });
  });

  it('a summary row matched by name but pointing at another folder is the script’s: never overwritten', async () => {
    const other = ['طالب تجربة', 'T', 'P', '2026-01-01', '2026-02-01', 9, 'https://drive.google.com/drive/folders/Other_ABCDEFGHIJ', ''];
    s.google.sheets.set(SUMMARY, [[...SUMMARY_HEADER], other]);
    const { sum } = await runAll();
    expect(sum).toMatchObject({ state: 'failed', error: 'summary_row_other_folder' });
    expect(s.google.sheets.get(SUMMARY)?.[1]).toEqual(other);
  });

  it('a PDF someone deleted in Drive is gone; dry_run plans only', async () => {
    expect(await s.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID, google_id: 'Deleted_ABCDEFGHIJ' }), s.ctx)).toMatchObject({ state: 'gone' });
    const dry = setup(NEW);
    const r = await dry.pdf.write(item({ kind: 'report_pdf', subject_id: REPORT_ID }), { live: false });
    expect(r).toMatchObject({ state: 'skipped', reason: 'dry_run', planned: { method: 'POST', target: 'drive:new-folder' } });
    expect(dry.google.log).toEqual([]);
  });
});
