import { describe, expect, it } from 'vitest';
import { REPORT_RUBRICS } from '../../rules';
import { reportPageRoutes as routes } from '..';

const PUBLIC_ID = 'a'.repeat(32);
const REPORT_ID = '6f1c2b0e-8a4d-4c1e-9b7a-3d2e1f0a9b8c';

const VIEW = {
  public_id: PUBLIC_ID,
  student: { name: 'سهيلة' },
  teacher: { name: 'أبرار' },
  lesson: { starts_at: '2026-11-20T16:00:00Z', ends_at: '2026-11-20T16:30:00Z' },
  tz: 'Asia/Riyadh',
  report: {
    form_version: 1,
    attendance: 'on_time',
    program: null,
    recited: null,
    new_memorization: null,
    revision: null,
    theory: null,
    grades: Object.fromEntries(REPORT_RUBRICS.map((r) => [r, null])),
    grade_overall: null,
    notes: null,
    homework: null,
    next_plan: null,
    content: null,
    version: 1,
    submitted_at: '2026-11-20T17:00:00Z',
    edited_at: null,
  },
  attachments: [],
  pdf: null,
};

describe('reportPageRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /report-pages/:publicId', 'GET /report-pages/by-report/:id']);
  });

  it('lets any signed-in reader ask and files both under the reports tag', () => {
    expect(Object.values(routes).map((r) => r.permissions)).toEqual([undefined, undefined]);
    expect(Object.values(routes).map((r) => r.tags)).toEqual([['reports'], ['reports']]);
  });

  it('takes a 32-hex public id or a report uuid, and refuses anything else', () => {
    expect(routes.byPublicId.params.parse({ publicId: PUBLIC_ID })).toEqual({ publicId: PUBLIC_ID });
    expect(routes.byPublicId.params.safeParse({ publicId: 'ABC' }).success).toBe(false);
    expect(routes.byReportId.params.parse({ id: REPORT_ID })).toEqual({ id: REPORT_ID });
    expect(routes.byReportId.params.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('answers the page, and refuses one whose pdf has no url', () => {
    expect(routes.byPublicId.response.parse(VIEW)).toEqual(VIEW);
    expect(routes.byReportId.response.safeParse({ ...VIEW, pdf: {} }).success).toBe(false);
  });
});
