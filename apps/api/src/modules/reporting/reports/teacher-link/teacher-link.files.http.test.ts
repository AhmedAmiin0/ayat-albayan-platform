import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AFTER,
  ATTACHMENT_ID,
  REPORT_ID,
  reportRow,
  submittedRow,
} from '@/modules/reporting/reports/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/test-app';
import { linkBase as base, OTHER_LESSON } from './teacher-link.fakes';

// Owner 2026-11-06: the no-login report page gets the teacher's attachments, within the window.
const files = () => `${base()}/reports/${REPORT_ID}/attachments`;
const PNG = { mime: 'image/png', size: 2048 };
const PATH = `${REPORT_ID}/a.png`;

describe('the teacher report link: attachments (no login)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const call = (method: 'POST' | 'DELETE' | 'GET', url: string, body?: object) =>
    h.call({ method, url, token: 'none', ...(body ? { body } : {}) });

  it("within the window: an upload URL, then the file registered by the link's teacher", async () => {
    h.storage.signedUpload.mockResolvedValue({ bucket: 'attachments', path: PATH, token: 't' });
    const slot = await call('POST', `${files()}/upload-url`, PNG);
    expect(slot.statusCode).toBe(200);
    expect(h.storage.signedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'report-attachments' }),
    );
    h.storage.exists.mockResolvedValue(true);
    h.files.add.mockResolvedValue({
      id: ATTACHMENT_ID,
      storage_path: PATH,
      ...PNG,
      created_at: '',
    });
    const res = await call('POST', files(), { ...PNG, path: PATH });
    expect(res.statusCode).toBe(201);
    // A teacher without a platform account: no auth user, so created_by stays null.
    expect(h.files.add).toHaveBeenCalledWith(
      expect.objectContaining({ report_id: REPORT_ID, created_by: null }),
    );
  });

  it('within the window: remove one, and open one through a signed URL', async () => {
    h.files.get.mockResolvedValue({ id: ATTACHMENT_ID, storage_path: PATH });
    expect((await call('DELETE', `${files()}/${ATTACHMENT_ID}`)).statusCode).toBe(204);
    expect(h.storage.remove).toHaveBeenCalledWith({ bucket: 'report-attachments', path: PATH });
    h.storage.signedDownload.mockResolvedValue({ url: 'https://files.example/a', expires_at: '' });
    expect((await call('GET', `${files()}/${ATTACHMENT_ID}/url`)).json()).toMatchObject({
      url: 'https://files.example/a',
    });
  });

  it("after the report's edit window (the link still open): 409 edit_window_closed, nothing changes", async () => {
    h.reports.get.mockResolvedValue(submittedRow({ submitted_at: '2026-10-04T14:00:00.000Z' }));
    vi.setSystemTime(new Date('2026-10-05T14:30:00Z'));
    const res = await call('POST', `${files()}/upload-url`, PNG);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('edit_window_closed');
    expect((await call('DELETE', `${files()}/${ATTACHMENT_ID}`)).statusCode).toBe(409);
    expect(h.storage.signedUpload).not.toHaveBeenCalled();
    expect(h.storage.remove).not.toHaveBeenCalled();
  });

  it('after the link expired: 410, nothing changes', async () => {
    vi.setSystemTime(new Date('2026-10-06T00:00:00Z'));
    expect((await call('POST', `${files()}/upload-url`, PNG)).statusCode).toBe(410);
    expect(h.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('a report of another lesson: 404, as if it did not exist', async () => {
    h.reports.get.mockResolvedValue(reportRow({ lesson_id: OTHER_LESSON }));
    expect((await call('POST', `${files()}/upload-url`, PNG)).statusCode).toBe(404);
    expect(h.storage.signedUpload).not.toHaveBeenCalled();
  });
});
