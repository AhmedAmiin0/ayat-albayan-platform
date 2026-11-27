import { describe, expect, it } from 'vitest';
import { salesStudentFileRoutes as routes } from '../student-file.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const REPORT = '22222222-2222-4222-8222-222222222222';

describe('salesStudentFileRoutes', () => {
  it('keeps the path, the permission and the tag the api serves today', () => {
    const { method, path, permissions, tags } = routes.reportPdf;
    expect([method, path, permissions, tags]).toEqual([
      'GET',
      '/sales/students/:id/reports/:reportId/pdf',
      ['self.sales_academy'],
      ['sales'],
    ]);
  });

  it('takes two uuids', () => {
    expect(routes.reportPdf.params.parse({ id: ID, reportId: REPORT })).toEqual({
      id: ID,
      reportId: REPORT,
    });
    expect(routes.reportPdf.params.safeParse({ id: ID, reportId: 'nope' }).success).toBe(false);
  });

  it('answers a signed url and its expiry', () => {
    const answer = { url: 'https://files.example/r.pdf?t=1', expires_at: '2026-11-27T11:00:00Z' };
    expect(routes.reportPdf.response.parse(answer)).toEqual(answer);
    expect(routes.reportPdf.response.safeParse({ url: 'not a url' }).success).toBe(false);
  });
});
