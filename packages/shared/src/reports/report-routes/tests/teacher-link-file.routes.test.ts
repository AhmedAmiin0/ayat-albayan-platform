import { describe, expect, it } from 'vitest';
import { teacherLinkFileRoutes as routes } from '..';
import { REPORT_ID } from './report-view.fixture';

const FILE_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const TOKEN = 'k'.repeat(43);
const BASE = '/public/teacher-report/:token/reports/:id/attachments';

describe('teacherLinkFileRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(routes).map((r) => `${r.method} ${r.path}`)).toEqual([
      `POST ${BASE}/upload-url`,
      `POST ${BASE}`,
      `DELETE ${BASE}/:attachmentId`,
      `GET ${BASE}/:attachmentId/url`,
    ]);
  });

  it('is public with no permission, only the link, and files every route under reports', () => {
    expect(Object.values(routes).some((r) => 'permissions' in r)).toBe(false);
    expect(new Set(Object.values(routes).map((r) => r.isPublic))).toEqual(new Set([true]));
    expect(Object.values(routes).every((r) => r.tags.join() === 'reports')).toBe(true);
  });

  it('takes a link token up to 100 characters, a report and an attachment uuid', () => {
    const all = { token: TOKEN, id: REPORT_ID, attachmentId: FILE_ID };
    expect(routes.url.params.parse(all)).toEqual(all);
    expect(routes.remove.params.safeParse({ ...all, token: '' }).success).toBe(false);
    expect(routes.remove.params.safeParse({ ...all, token: 'k'.repeat(101) }).success).toBe(false);
    expect(routes.uploadUrl.params.safeParse({ token: TOKEN, id: 'r-1' }).success).toBe(false);
  });

  it('reads the same bodies and answers as the signed-in attachment routes', () => {
    expect(routes.uploadUrl.body.safeParse({ mime: 'image/png', size: 900 }).success).toBe(true);
    expect(routes.register.body.safeParse({ mime: 'image/png', size: 900 }).success).toBe(false);
    expect(routes.remove.response).toBe('empty');
    const link = { url: 'https://files.test/a', expires_at: '2026-11-20T19:00:00Z' };
    expect(routes.url.response.parse(link)).toEqual(link);
  });
});
