import { reportPageViewSchema } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { pageFacts, pageRow, PUBLIC_ID, REPORT_ID, user } from './report-page.fakes';
import type { ReportPageRepo } from './report-page.repo';
import { ReportPageService } from './report-page.service';
import { ReportReaders } from './report-readers';

function setup(row = pageRow()) {
  const repo = {
    report: vi.fn(async () => row),
    facts: vi.fn(async () => pageFacts()),
    owns: vi.fn(async (profileId: string) => profileId === 'owner'),
  };
  const storage = {
    signedDownloads: vi.fn(
      async () =>
        new Map([
          ['r/a.pdf', 'https://files.example/a'],
          ['r/b.png', 'https://files.example/b'],
        ]),
    ),
    signedDownload: vi.fn(async () => ({
      url: 'https://files.example/report.pdf',
      expires_at: '',
    })),
  };
  const r = repo as unknown as ReportPageRepo;
  const service = new ReportPageService(
    r,
    new ReportReaders(r),
    storage as unknown as StorageService,
  );
  return { service, repo, storage };
}

describe('ReportPageService.signedIn — the live page for a reader', () => {
  it('the saved report, its files in upload order with signed URLs, and the PDF', async () => {
    const { service, repo, storage } = setup();
    const view = await service.signedIn({ by: 'public', value: PUBLIC_ID }, user('sales', 'owner'));
    expect(repo.report).toHaveBeenCalledWith({ by: 'public', value: PUBLIC_ID });
    expect(view).toMatchObject({
      public_id: PUBLIC_ID,
      student: { name: 'سهيلة' },
      teacher: { name: 'أبرار' },
      tz: 'Asia/Riyadh',
    });
    expect(view.attachments.map((f) => f.url)).toEqual([
      'https://files.example/a',
      'https://files.example/b',
    ]);
    expect(view.pdf).toEqual({ url: 'https://files.example/report.pdf' });
    expect(storage.signedDownload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'reports', path: 's1/l1.pdf' }),
    );
    expect(view.report).toMatchObject({
      form_version: 2,
      attendance: 'on_time',
      grade_overall: 'excellent',
    });
    // The clients parse it with the shared schema (rule 12).
    expect(reportPageViewSchema.parse(view)).toEqual(view);
    expect(JSON.stringify(view)).not.toMatch(/storage_path|pdf_error|r\/a\.pdf/);
  });

  it('another assistant (not the owner) gets 404, as an unknown report', async () => {
    const { service } = setup();
    await expect(
      service.signedIn({ by: 'id', value: REPORT_ID }, user('sales', 'other')),
    ).rejects.toMatchObject({
      response: { code: 'report_not_found' },
    });
  });

  it('a draft or an unknown key: 404 (the repo reads submitted reports only)', async () => {
    const { service, repo } = setup();
    repo.report.mockResolvedValueOnce(null as never);
    await expect(
      service.signedIn({ by: 'public', value: PUBLIC_ID }, user('admin')),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('the PDF still rendering (an edit): the page shows the saved report, no PDF link', async () => {
    const { service, storage } = setup(pageRow({ pdf_status: 'pending' }));
    const view = await service.signedIn({ by: 'public', value: PUBLIC_ID }, user('admin'));
    expect(view.pdf).toBeNull();
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });
});
