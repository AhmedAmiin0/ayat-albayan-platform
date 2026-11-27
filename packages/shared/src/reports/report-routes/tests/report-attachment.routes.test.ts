import { describe, expect, it } from 'vitest';
import { reportAttachmentRoutes as routes } from '..';
import { REPORT_ID } from './report-view.fixture';

const FILE_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const FILE = {
  id: FILE_ID,
  storage_path: `${REPORT_ID}/x.png`,
  mime: 'image/png',
  size: 900,
  created_at: '2026-11-20T18:00:00Z',
};

describe('reportAttachmentRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(routes).map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /reports/:id/attachments/upload-url',
      'POST /reports/:id/attachments',
      'DELETE /reports/:id/attachments/:attachmentId',
      'GET /reports/:id/attachments/:attachmentId/url',
    ]);
  });

  it('writes on reports.write, reads the link on reports.read, under the reports tag', () => {
    expect(Object.values(routes).map((r) => r.permissions)).toEqual([
      ['reports.write'],
      ['reports.write'],
      ['reports.write'],
      ['reports.read'],
    ]);
    expect(Object.values(routes).every((r) => r.tags.join() === 'reports')).toBe(true);
  });

  it('takes a report and an attachment uuid and refuses anything else', () => {
    const both = { id: REPORT_ID, attachmentId: FILE_ID };
    expect(routes.url.params.parse(both)).toEqual(both);
    expect(routes.remove.params.safeParse({ ...both, attachmentId: 'a-1' }).success).toBe(false);
    expect(routes.uploadUrl.params.safeParse({ id: 'r-1' }).success).toBe(false);
  });

  it('checks the file type and size before an upload and the path on register', () => {
    expect(routes.uploadUrl.body.safeParse({ mime: 'video/mp4', size: 10 }).success).toBe(false);
    expect(routes.register.body.safeParse({ mime: 'image/png', size: 5 }).success).toBe(false);
    expect(routes.register.body.parse({ mime: 'image/png', size: 5, path: 'r/x.png' })).toEqual({
      mime: 'image/png',
      size: 5,
      path: 'r/x.png',
    });
  });

  it('answers the upload slot, the registered file, nothing on remove and a signed link', () => {
    const slot = { bucket: 'report-attachments', path: 'r/x.png', token: 't', signed_url: 'u' };
    expect(routes.uploadUrl.response.parse(slot)).toEqual(slot);
    expect(routes.register.response.parse(FILE)).toEqual(FILE);
    expect(routes.register.response.safeParse({ ...FILE, size: '900' }).success).toBe(false);
    expect(routes.remove.response).toBe('empty');
    expect(routes.url.response.safeParse({ url: 'nope', expires_at: 'x' }).success).toBe(false);
  });
});
