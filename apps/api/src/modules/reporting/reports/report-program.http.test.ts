import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, FULL_GRADES, REPORT_ID, reportRow, submittedRow } from './reports.fakes';
import { reportsApp } from './test-app';

// «البرنامج *» on the lesson report (docs/13-forms-spec.md form 2): prefilled from the student,
// editable by the teacher, kept by a submit that leaves it out.
const TEXT = { recited: 'الفاتحة', newMemorization: 'الملك 1-5', revision: 'جزء عم', notes: 'ممتازة', homework: 'سورة الملك' };
const FORM = { attendance: 'on_time', grades: FULL_GRADES, overall: 'excellent', ...TEXT, expectedVersion: 0 };

describe('report program', () => {
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

  it('the draft saves the program the teacher picked, and the view returns it', async () => {
    h.reports.updateDraft.mockResolvedValue(reportRow({ program: 'arabic' }));
    const res = await h.call({ method: 'PUT', url: `/reports/${REPORT_ID}/draft`, body: { program: 'arabic' } });
    expect(h.reports.updateDraft).toHaveBeenCalledWith(REPORT_ID, { program: 'arabic' });
    expect(res.json().program).toBe('arabic');
  });

  it('only the three programs of the form are accepted', async () => {
    const res = await h.call({ method: 'PUT', url: `/reports/${REPORT_ID}/draft`, body: { program: 'maths' } });
    expect(res.statusCode).toBe(400);
  });

  it('submit sends the program in the form columns; leaving it out sends null (the RPC keeps the stored one)', async () => {
    h.reports.get.mockResolvedValueOnce(reportRow()).mockResolvedValue(submittedRow({ program: 'islamic_studies' }));
    await h.call({ method: 'POST', url: `/reports/${REPORT_ID}/submit`, body: { ...FORM, program: 'islamic_studies' } });
    expect(h.reports.submit.mock.calls[0]?.[0].report.program).toBe('islamic_studies');
    h.reports.get.mockResolvedValueOnce(reportRow()).mockResolvedValue(submittedRow());
    await h.call({ method: 'POST', url: `/reports/${REPORT_ID}/submit`, body: FORM });
    expect(h.reports.submit.mock.calls[1]?.[0].report.program).toBeNull();
  });

  it('a report with no program anywhere (older than migration 167) cannot be sent: 400 missing_program', async () => {
    h.reports.get.mockResolvedValue(reportRow({ program: null }));
    const res = await h.call({ method: 'POST', url: `/reports/${REPORT_ID}/submit`, body: FORM });
    expect([res.statusCode, res.json().code]).toEqual([400, 'missing_program']);
    expect(h.reports.submit).not.toHaveBeenCalled();
  });
});
