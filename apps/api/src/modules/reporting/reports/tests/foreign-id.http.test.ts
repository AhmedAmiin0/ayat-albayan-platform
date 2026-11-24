import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OTHER_TEACHER_ID, REPORT_ID, reportRow, submittedRow } from './reports.fakes';
import { reportsApp } from './test-app';

const BASE = `/reports/${REPORT_ID}`;
const READY = { pdf_status: 'ready', pdf_path: 's/l.pdf' } as const;

describe('report draft and PDF: a teacher reaches only her own reports', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it("another teacher's draft is 403 and nothing is written", async () => {
    const body = { notes: 'x' };
    const res = await h.call({ method: 'PUT', url: `${BASE}/draft`, token: 'other', body });
    expect(res.statusCode).toBe(403);
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
  });

  it("another teacher's report draft is 403 for this teacher", async () => {
    h.reports.get.mockResolvedValue(reportRow({ teacher_id: OTHER_TEACHER_ID }));
    expect((await h.call({ method: 'PUT', url: `${BASE}/draft`, body: {} })).statusCode).toBe(403);
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
  });

  it("another teacher's PDF is 403 and nothing is signed", async () => {
    h.reports.get.mockResolvedValue(submittedRow(READY));
    const res = await h.call({ method: 'GET', url: `${BASE}/pdf`, token: 'other' });
    expect(res.statusCode).toBe(403);
    expect(h.files.pdfName).not.toHaveBeenCalled();
    expect(h.storage.signedDownload).not.toHaveBeenCalled();
  });

  it('a teacher without a teachers row is 403 on the draft and the PDF', async () => {
    h.teachers.idByProfile.mockResolvedValue(null);
    h.reports.get.mockResolvedValue(submittedRow(READY));
    expect((await h.call({ method: 'GET', url: `${BASE}/pdf` })).statusCode).toBe(403);
    expect((await h.call({ method: 'PUT', url: `${BASE}/draft`, body: {} })).statusCode).toBe(403);
    expect(h.storage.signedDownload).not.toHaveBeenCalled();
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
  });

  it('an unknown report is 404 and nothing is written or signed', async () => {
    h.reports.get.mockResolvedValue(null);
    const draft = await h.call({ method: 'PUT', url: `${BASE}/draft`, token: 'other', body: {} });
    expect(draft.statusCode).toBe(404);
    expect((await h.call({ method: 'GET', url: `${BASE}/pdf`, token: 'other' })).statusCode).toBe(404);
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
    expect(h.storage.signedDownload).not.toHaveBeenCalled();
  });
});
