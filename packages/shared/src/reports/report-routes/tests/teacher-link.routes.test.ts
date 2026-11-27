import { describe, expect, it } from 'vitest';
import { reportRoutes, teacherLinkRoutes as routes } from '..';
import { REPORT_ID, REPORT_VIEW } from './report-view.fixture';

const TOKEN = 'k'.repeat(43);
const BASE = '/public/teacher-report/:token/reports/:id';

describe('teacherLinkRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(routes).map((r) => `${r.method} ${r.path}`)).toEqual([
      `PUT ${BASE}/draft`,
      `POST ${BASE}/submit`,
      `PUT ${BASE}/v2/draft`,
      `POST ${BASE}/v2/submit`,
    ]);
  });

  it('needs no permission, only the link, and files every route under reports', () => {
    expect(Object.values(routes).some((r) => 'permissions' in r)).toBe(false);
    expect(Object.values(routes).every((r) => r.tags.join() === 'reports')).toBe(true);
  });

  it('takes a link token up to 100 characters and a report uuid', () => {
    const both = { token: TOKEN, id: REPORT_ID };
    expect(routes.draft.params.parse(both)).toEqual(both);
    expect(routes.submit.params.safeParse({ ...both, token: '' }).success).toBe(false);
    expect(routes.draftV2.params.safeParse({ ...both, token: 'k'.repeat(101) }).success).toBe(
      false,
    );
    expect(routes.submitV2.params.safeParse({ token: TOKEN, id: 'r-1' }).success).toBe(false);
  });

  it('reads the same bodies and answers as the signed-in report writes', () => {
    expect(routes.draft.body).toBe(reportRoutes.draft.body);
    expect(routes.submit.body).toBe(reportRoutes.submit.body);
    expect(routes.draftV2.body).toBe(reportRoutes.draftV2.body);
    expect(routes.submitV2.body).toBe(reportRoutes.submitV2.body);
    expect(routes.submit.response.parse(REPORT_VIEW)).toEqual(REPORT_VIEW);
    expect(routes.draft.response.safeParse({ ...REPORT_VIEW, status: 'sent' }).success).toBe(false);
  });
});
