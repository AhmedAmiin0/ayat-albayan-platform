import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REPORT_ID, TEACHER } from '@/modules/reporting/reports/tests/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/tests/test-app';
import { ReportFilesService } from '@/modules/reporting/reports/files/report-files.service';

const PATH = `${REPORT_ID}/0b7e4c1e-3f5a-4d2b-9c41-5a8e2f6d7c10.webm`;
const WEBM = Uint8Array.of(0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7);
const HTML = Uint8Array.from('<html><scrip', (c) => c.charCodeAt(0));
const VOICE = { mime: 'audio/webm' as const, size: 4096, path: PATH };
const SAVED = { id: 'a1', storage_path: PATH, mime: 'audio/webm', size: 4096, created_at: '' };

// Audit A2: the first bytes, not the client's word, decide the type (the no-login link too).
describe('ReportFilesService.register: the file type by content', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  let files: ReportFilesService;
  beforeAll(async () => {
    h = await reportsApp();
    files = h.app.get(ReportFilesService);
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  const register = (head: Uint8Array | null) => {
    h.storage.head.mockResolvedValue(head);
    return files.register({ id: REPORT_ID, user: TEACHER, file: VOICE });
  };

  it('accepts a webm voice note whose bytes are webm', async () => {
    h.files.add.mockResolvedValue(SAVED);
    expect(await register(WEBM)).toEqual(SAVED);
    expect(h.storage.head).toHaveBeenCalledWith({ bucket: 'report-attachments', path: PATH }, 12);
    expect(h.files.add).toHaveBeenCalledWith(expect.objectContaining({ mime: 'audio/webm' }));
  });

  it('refuses a file whose bytes are not the mime it was sent as (400 attachment_type)', async () => {
    await expect(register(HTML)).rejects.toMatchObject({ response: { code: 'attachment_type' } });
    await expect(register(Uint8Array.of(0xff, 0xfb, 0x90))).rejects.toMatchObject({ status: 400 });
    expect(h.files.add).not.toHaveBeenCalled();
  });

  it('a path not uploaded yet stays 400 attachment_path', async () => {
    await expect(register(null)).rejects.toMatchObject({ response: { code: 'attachment_path' } });
  });
});
