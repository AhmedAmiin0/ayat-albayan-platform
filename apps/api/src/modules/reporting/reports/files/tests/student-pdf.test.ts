import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REPORT_ID, STUDENT_ID, SIBLING_ID, submittedRow } from '@/modules/reporting/reports/tests/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/tests/test-app';
import { ReportFilesService } from '@/modules/reporting/reports/files/report-files.service';

const SIGNED = { url: 'https://storage/signed', expires_at: '2026-10-04T16:00:00.000Z' };

// docs/16 row 36: the report must belong to the caller's checked student.
describe('ReportFilesService.studentPdfUrl', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  let files: ReportFilesService;
  beforeAll(async () => {
    h = await reportsApp();
    files = h.app.get(ReportFilesService);
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.storage.signedDownload.mockResolvedValue(SIGNED);
  });

  it('signs the PDF of a sent report of that student', async () => {
    h.reports.get.mockResolvedValue(submittedRow({ pdf_status: 'ready', pdf_path: 's/l.pdf' }));
    expect(await files.studentPdfUrl({ id: REPORT_ID, studentId: STUDENT_ID })).toEqual(SIGNED);
    expect(h.storage.signedDownload).toHaveBeenCalledWith({ bucket: 'reports', path: 's/l.pdf' });
  });

  it('another student\'s report, an unknown one or a draft is 404; a PDF still building is 409 pdf_not_ready', async () => {
    h.reports.get.mockResolvedValue(submittedRow({ pdf_status: 'ready', pdf_path: 's/l.pdf' }));
    await expect(
      files.studentPdfUrl({ id: REPORT_ID, studentId: SIBLING_ID }),
    ).rejects.toMatchObject({ status: 404 });
    h.reports.get.mockResolvedValue(null);
    await expect(
      files.studentPdfUrl({ id: REPORT_ID, studentId: STUDENT_ID }),
    ).rejects.toMatchObject({ status: 404 });
    h.reports.get.mockResolvedValue(
      submittedRow({ status: 'draft', pdf_status: 'ready', pdf_path: 's/l.pdf' }),
    );
    await expect(
      files.studentPdfUrl({ id: REPORT_ID, studentId: STUDENT_ID }),
    ).rejects.toMatchObject({ status: 404 });
    h.reports.get.mockResolvedValue(submittedRow());
    await expect(files.studentPdfUrl({ id: REPORT_ID, studentId: STUDENT_ID })).rejects.toMatchObject({ response: { code: 'pdf_not_ready' } });
    expect(h.storage.signedDownload).not.toHaveBeenCalled();
  });
});
