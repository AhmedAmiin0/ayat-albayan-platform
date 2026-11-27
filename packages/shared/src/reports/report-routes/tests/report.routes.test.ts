import { describe, expect, it } from 'vitest';
import { reportRoutes as routes } from '..';
import { REPORT_ID, REPORT_VIEW } from './report-view.fixture';

const lines = () => Object.values(routes).map((r) => `${r.method} ${r.path}`);

describe('reportRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(lines()).toEqual([
      'GET /reports/:id',
      'PUT /reports/:id/draft',
      'POST /reports/:id/submit',
      'GET /reports/:id/pdf',
      'POST /reports/:id/pdf/retry',
      'PUT /reports/:id/v2/draft',
      'POST /reports/:id/v2/submit',
    ]);
  });

  it('keeps each route on the permission it has today, under the reports tag', () => {
    expect(Object.values(routes).map((r) => r.permissions)).toEqual([
      ['reports.read'],
      ['reports.write'],
      ['reports.write'],
      ['reports.read'],
      ['reports.resend'],
      ['reports.write'],
      ['reports.write'],
    ]);
    expect(Object.values(routes).every((r) => r.tags.join() === 'reports')).toBe(true);
  });

  it('takes a report uuid and refuses anything else', () => {
    expect(routes.get.params.parse({ id: REPORT_ID })).toEqual({ id: REPORT_ID });
    expect(routes.retryPdf.params.safeParse({ id: 'nope' }).success).toBe(false);
  });

  it('answers the report view and refuses one with an unknown status', () => {
    expect(routes.get.response.parse(REPORT_VIEW)).toEqual(REPORT_VIEW);
    expect(routes.draft.response.safeParse({ ...REPORT_VIEW, status: 'sent' }).success).toBe(false);
    expect(routes.submitV2.response.safeParse({ ...REPORT_VIEW, form_version: 3 }).success).toBe(
      false,
    );
  });

  it('checks a submit with the form rules and leaves a draft free', () => {
    expect(routes.submit.body.safeParse({ expectedVersion: 0 }).success).toBe(false);
    expect(routes.draft.body.parse({})).toEqual({});
    expect(routes.draftV2.body.parse({ notes: '' })).toEqual({ notes: null });
  });

  it('answers a 1 h signed link for the pdf', () => {
    const link = { url: 'https://files.test/r.pdf', expires_at: '2026-11-20T18:00:00Z' };
    expect(routes.pdf.response.parse(link)).toEqual(link);
  });
});
