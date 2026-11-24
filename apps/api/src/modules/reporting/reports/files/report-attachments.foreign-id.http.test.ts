import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, ATTACHMENT_ID, REPORT_ID } from '@/modules/reporting/reports/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/test-app';

const BASE = `/reports/${REPORT_ID}/attachments`;
const PATH = `${REPORT_ID}/x.png`;
const FILE = { id: ATTACHMENT_ID, storage_path: PATH, mime: 'image/png', size: 900, created_at: '' };
const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47);

describe('report attachments: a teacher changes only her own reports', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
    h.files.get.mockResolvedValue(FILE);
    h.storage.head.mockResolvedValue(PNG);
  });
  afterEach(() => vi.useRealTimers());

  const nothingTouched = () => {
    for (const fn of [h.storage.signedUpload, h.storage.head, h.storage.remove]) {
      expect(fn).not.toHaveBeenCalled();
    }
    for (const fn of [h.files.add, h.files.get, h.files.remove]) expect(fn).not.toHaveBeenCalled();
  };

  it("another teacher's report upload URL is 403 and nothing is signed", async () => {
    const body = { mime: 'image/png', size: 9 };
    const res = await h.call({ method: 'POST', url: `${BASE}/upload-url`, token: 'other', body });
    expect(res.statusCode).toBe(403);
    nothingTouched();
  });

  it("registering a file on another teacher's report is 403 and nothing is written", async () => {
    const body = { mime: 'image/png', size: 900, path: PATH };
    const res = await h.call({ method: 'POST', url: BASE, token: 'other', body });
    expect(res.statusCode).toBe(403);
    nothingTouched();
  });

  it("deleting another teacher's attachment is 403 and nothing is removed", async () => {
    const url = `${BASE}/${ATTACHMENT_ID}`;
    expect((await h.call({ method: 'DELETE', url, token: 'other' })).statusCode).toBe(403);
    nothingTouched();
  });

  it('an unknown report is 404 on every attachment change', async () => {
    h.reports.get.mockResolvedValue(null);
    const upload = { mime: 'image/png', size: 9 };
    const register = { ...upload, path: PATH };
    const calls = [
      { method: 'POST', url: `${BASE}/upload-url`, body: upload },
      { method: 'POST', url: BASE, body: register },
      { method: 'DELETE', url: `${BASE}/${ATTACHMENT_ID}` },
    ] as const;
    for (const c of calls) expect((await h.call({ ...c, token: 'other' })).statusCode).toBe(404);
    nothingTouched();
  });

  it('an attachment of another report is 404 for the report owner', async () => {
    h.files.get.mockResolvedValue(null);
    expect((await h.call({ method: 'DELETE', url: `${BASE}/${ATTACHMENT_ID}` })).statusCode).toBe(404);
    expect(h.files.get).toHaveBeenCalledWith(REPORT_ID, ATTACHMENT_ID);
    expect(h.storage.remove).not.toHaveBeenCalled();
    expect(h.files.remove).not.toHaveBeenCalled();
  });
});
