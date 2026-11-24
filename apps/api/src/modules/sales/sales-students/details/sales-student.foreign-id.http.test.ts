import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '@/common/auth/auth.guard';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { StorageService } from '@/common/storage/storage.service';
import { ReportAttachmentsQueries } from '@/modules/reporting/reports/files/report-attachments.queries';
import { ReportsQueries } from '@/modules/reporting/reports/reports.queries';
import {
  REPORT_ID,
  SIBLING_ID,
  STUDENT_ID,
  submittedRow,
} from '@/modules/reporting/reports/reports.fakes';
import { verify } from '@/modules/sales/sales/academy/sales-academy.fakes';

const SIGNED = { url: 'https://storage/signed', expires_at: '2026-10-27T16:00:00.000Z' };
const pdfUrl = (studentId: string) => `/sales/students/${studentId}/reports/${REPORT_ID}/pdf`;

async function pdfApp() {
  const reports = { get: vi.fn() };
  const files = { pdfName: vi.fn() };
  const storage = { signedDownload: vi.fn() };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ReportsQueries).useValue(reports)
    .overrideProvider(ReportAttachmentsQueries).useValue(files)
    .overrideProvider(StorageService).useValue(storage)
    .overrideProvider(SettingsService).useValue(fakeSettings({ sales_require_assignee: true }))
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const get = (url: string) =>
    app.inject({ method: 'GET', url, headers: { authorization: 'Bearer salesA' } });
  return { app, get, reports, files, storage };
}

// docs/16 row 36: the report PDF route signs only a sent report of the student in the path.
describe('GET /sales/students/:id/reports/:reportId/pdf with a report of another student', () => {
  let t: Awaited<ReturnType<typeof pdfApp>>;
  beforeAll(async () => {
    t = await pdfApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    t.reports.get.mockResolvedValue(submittedRow({ pdf_status: 'ready', pdf_path: 's/l.pdf' }));
    t.files.pdfName.mockResolvedValue(null);
    t.storage.signedDownload.mockResolvedValue(SIGNED);
  });

  it('the report of the student in the path is signed', async () => {
    const res = await t.get(pdfUrl(STUDENT_ID));
    expect([res.statusCode, res.json()]).toEqual([200, SIGNED]);
    expect(t.reports.get).toHaveBeenCalledWith(REPORT_ID);
  });

  it('another student\'s report is 404; nothing is signed', async () => {
    const res = await t.get(pdfUrl(SIBLING_ID));
    expect(res.statusCode).toBe(404);
    expect(t.files.pdfName).not.toHaveBeenCalled();
    expect(t.storage.signedDownload).not.toHaveBeenCalled();
  });

  it('an unknown report or a draft is 404; nothing is signed', async () => {
    t.reports.get.mockResolvedValueOnce(null);
    expect((await t.get(pdfUrl(STUDENT_ID))).statusCode).toBe(404);
    const draft = submittedRow({ status: 'draft', pdf_status: 'ready', pdf_path: 's/l.pdf' });
    t.reports.get.mockResolvedValueOnce(draft);
    expect((await t.get(pdfUrl(STUDENT_ID))).statusCode).toBe(404);
    expect(t.storage.signedDownload).not.toHaveBeenCalled();
  });
});
