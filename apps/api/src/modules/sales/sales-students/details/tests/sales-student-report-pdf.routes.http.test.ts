import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MINE,
  REPORT,
  studentsApp,
} from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const URL = `/sales/students/${MINE}/reports/${REPORT}/pdf`;

describe('GET /sales/students/:id/reports/:reportId/pdf served from its route object', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('a malformed :reportId answers the validation_failed envelope', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}/reports/nope/pdf`, { token: 'salesA' });
    expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
      400,
      'validation_failed',
    ]);
    expect(t.files.studentPdfUrl).not.toHaveBeenCalled();
  });

  it('a signed answer without a url is a 500 response_invalid', async () => {
    t.files.studentPdfUrl.mockResolvedValue({ url: '', expires_at: '2026-10-27T16:00:00.000Z' });
    const res = await t.call('GET', URL, { token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });
});
