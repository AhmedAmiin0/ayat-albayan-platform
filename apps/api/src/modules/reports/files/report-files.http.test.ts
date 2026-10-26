import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, ATTACHMENT_ID, REPORT_ID, submittedRow } from '../reports.fakes';
import { reportsApp } from '../test-app';

const BASE = `/reports/${REPORT_ID}`;
const FILE = { id: ATTACHMENT_ID, storage_path: `${REPORT_ID}/x.png`, mime: 'image/png', size: 900, created_at: AFTER.toISOString() };
const SIGNED = { url: 'https://storage/signed', expires_at: '2026-10-04T16:00:00.000Z' };

describe('report PDF (R6, R12) and attachments (R7–R10; R-REP-02/03)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
    h.storage.signedDownload.mockResolvedValue(SIGNED);
  });
  afterEach(() => vi.useRealTimers());

  it('PDF: 409 pdf_not_ready until ready, then a signed URL to its path', async () => {
    h.reports.get.mockResolvedValue(submittedRow());
    expect((await h.call({ method: 'GET', url: `${BASE}/pdf` })).json().code).toBe('pdf_not_ready');
    h.reports.get.mockResolvedValue(submittedRow({ pdf_status: 'ready', pdf_path: 's/l.pdf' }));
    expect((await h.call({ method: 'GET', url: `${BASE}/pdf` })).json()).toEqual(SIGNED);
    expect(h.storage.signedDownload).toHaveBeenCalledWith({ bucket: 'reports', path: 's/l.pdf' });
    // Saved under the WhatsApp file name, not the lesson uuid.
    h.files.pdfName.mockResolvedValue({ code: 'AB-0183', startsAt: new Date('2026-09-29T14:00:00Z'), tz: 'Asia/Riyadh' });
    await h.call({ method: 'GET', url: `${BASE}/pdf` });
    expect(h.storage.signedDownload).toHaveBeenLastCalledWith({
      bucket: 'reports',
      path: 's/l.pdf',
      download: 'AB-0183_2026-09-29_تقرير-الحلقة.pdf',
    });
  });

  it('retry (admin): failed → pending and the builder is kicked; 409 pdf_not_failed otherwise; teacher 403', async () => {
    h.reports.retryPdf.mockResolvedValue(true);
    expect((await h.call({ method: 'POST', url: `${BASE}/pdf/retry`, token: 'admin' })).statusCode).toBe(200);
    expect(h.pdf.enqueue).toHaveBeenCalledWith(REPORT_ID);
    h.reports.retryPdf.mockResolvedValue(false);
    expect((await h.call({ method: 'POST', url: `${BASE}/pdf/retry`, token: 'admin' })).json().code).toBe('pdf_not_failed');
    expect((await h.call({ method: 'POST', url: `${BASE}/pdf/retry` })).statusCode).toBe(403);
  });

  it('upload URL under the report; bad type / size → 400 with the code', async () => {
    h.storage.signedUpload.mockImplementation(async (ref: { bucket: string; path: string }) => ({ ...ref, token: 't', signed_url: 'u' }));
    const res = await h.call({ method: 'POST', url: `${BASE}/attachments/upload-url`, body: { mime: 'audio/mpeg', size: 1000 } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ bucket: 'report-attachments', token: 't' });
    expect(res.json().path).toMatch(new RegExp(`^${REPORT_ID}/[0-9a-f-]{36}\\.mp3$`));
    const bad = await h.call({ method: 'POST', url: `${BASE}/attachments/upload-url`, body: { mime: 'video/mp4', size: 10 } });
    expect(bad.json().issues[0].message).toBe('attachment_type');
  });

  it('register: only an uploaded path under this report (400 attachment_path)', async () => {
    h.storage.exists.mockResolvedValue(true);
    h.files.add.mockResolvedValue(FILE);
    const ok = await h.call({ method: 'POST', url: `${BASE}/attachments`, body: { mime: 'image/png', size: 900, path: FILE.storage_path } });
    expect(ok.statusCode).toBe(201);
    expect(h.files.add).toHaveBeenCalledWith(expect.objectContaining({ report_id: REPORT_ID, storage_path: FILE.storage_path }));
    const other = await h.call({ method: 'POST', url: `${BASE}/attachments`, body: { mime: 'image/png', size: 9, path: 'other/x.png' } });
    expect(other.json().code).toBe('attachment_path');
    h.storage.exists.mockResolvedValue(false);
    const missing = await h.call({ method: 'POST', url: `${BASE}/attachments`, body: { mime: 'image/png', size: 9, path: FILE.storage_path } });
    expect(missing.json().code).toBe('attachment_path');
  });

  it('after the teacher window closes → 409 edit_window_closed; the admin still may', async () => {
    h.reports.get.mockResolvedValue(submittedRow());
    vi.setSystemTime(new Date(AFTER.getTime() + 25 * 3_600_000));
    const body = { mime: 'image/png', size: 9 };
    expect((await h.call({ method: 'POST', url: `${BASE}/attachments/upload-url`, body })).json().code).toBe('edit_window_closed');
    h.storage.signedUpload.mockResolvedValue({ bucket: 'report-attachments', path: 'p', token: 't', signed_url: 'u' });
    expect((await h.call({ method: 'POST', url: `${BASE}/attachments/upload-url`, body, token: 'admin' })).statusCode).toBe(200);
  });

  it('delete removes the object and the row; unknown → 404', async () => {
    h.files.get.mockResolvedValue(FILE);
    expect((await h.call({ method: 'DELETE', url: `${BASE}/attachments/${ATTACHMENT_ID}` })).statusCode).toBe(204);
    expect(h.storage.remove).toHaveBeenCalledWith({ bucket: 'report-attachments', path: FILE.storage_path });
    expect(h.files.remove).toHaveBeenCalledWith(ATTACHMENT_ID);
    h.files.get.mockResolvedValue(null);
    expect((await h.call({ method: 'DELETE', url: `${BASE}/attachments/${ATTACHMENT_ID}` })).statusCode).toBe(404);
  });

  it('download URL of an attachment; another teacher 403', async () => {
    h.files.get.mockResolvedValue(FILE);
    expect((await h.call({ method: 'GET', url: `${BASE}/attachments/${ATTACHMENT_ID}/url` })).json()).toEqual(SIGNED);
    expect((await h.call({ method: 'GET', url: `${BASE}/attachments/${ATTACHMENT_ID}/url`, token: 'other' })).statusCode).toBe(403);
  });
});
