import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REPORT_ID, reportRow, submittedRow } from './reports.fakes';
import { reportsApp } from './test-app';

const URL = `/reports/${REPORT_ID}/draft`;

describe('PUT /reports/:id/draft (R2 autosave; R-REP-02) and GET /reports/:id (R4)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('writes only the fields sent (null clears), returns the view', async () => {
    h.reports.updateDraft.mockResolvedValue(reportRow({ recited: 'الفاتحة', grade_tajweed: 'good' }));
    const res = await h.call({ method: 'PUT', url: URL, body: { recited: ' الفاتحة ', grades: { tajweed: 'good' }, notes: '' } });
    expect(res.statusCode).toBe(200);
    expect(h.reports.updateDraft).toHaveBeenCalledWith(REPORT_ID, { recited: 'الفاتحة', grade_tajweed: 'good', notes: null });
    expect(res.json()).toMatchObject({ recited: 'الفاتحة', grades: { tajweed: 'good' }, status: 'draft' });
  });

  it('an empty autosave is a no-op write', async () => {
    expect((await h.call({ method: 'PUT', url: URL, body: {} })).statusCode).toBe(200);
    expect(h.reports.updateDraft).toHaveBeenCalledWith(REPORT_ID, {});
  });

  it('a submitted report is edited through submit only → 409 already_submitted', async () => {
    h.reports.get.mockResolvedValue(submittedRow());
    const res = await h.call({ method: 'PUT', url: URL, body: { notes: 'x' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('already_submitted');
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
  });

  it('submitted meanwhile (the guarded update matched nothing) → 409 already_submitted', async () => {
    h.reports.updateDraft.mockResolvedValue(null);
    expect((await h.call({ method: 'PUT', url: URL, body: { notes: 'x' } })).json().code).toBe('already_submitted');
  });

  it('bad values → 400 validation_failed', async () => {
    const res = await h.call({ method: 'PUT', url: URL, body: { overall: 'great' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('validation_failed');
  });

  it('GET: own report 200, another teacher 403, a guardian 403, unknown 404', async () => {
    expect((await h.call({ method: 'GET', url: `/reports/${REPORT_ID}` })).json()).toMatchObject({ id: REPORT_ID, can_edit: true });
    expect((await h.call({ method: 'GET', url: `/reports/${REPORT_ID}`, token: 'other' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: `/reports/${REPORT_ID}`, token: 'guardian' })).statusCode).toBe(403);
    h.reports.get.mockResolvedValue(null);
    expect((await h.call({ method: 'GET', url: `/reports/${REPORT_ID}` })).statusCode).toBe(404);
  });
});
