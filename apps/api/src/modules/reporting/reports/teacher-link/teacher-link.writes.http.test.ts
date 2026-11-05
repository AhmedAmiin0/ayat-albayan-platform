import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AFTER,
  LESSON_ID,
  REPORT_ID,
  reportRow,
  submittedRow,
  TEACHER_ID,
} from '@/modules/reporting/reports/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/test-app';
import { LINK_FORM as FORM, linkBase as base, OTHER_LESSON } from './teacher-link.fakes';

describe('the teacher report link: writes to the link’s lesson only (no login)', () => {
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

  it('draft: only a report of the link’s lesson; another lesson’s report → 404, nothing written', async () => {
    const ok = await h.call({
      method: 'PUT',
      url: `${base()}/reports/${REPORT_ID}/draft`,
      token: 'none',
      body: { notes: 'x' },
    });
    expect(ok.statusCode).toBe(200);
    h.reports.get.mockResolvedValue(reportRow({ lesson_id: OTHER_LESSON }));
    h.reports.updateDraft.mockClear();
    const res = await h.call({
      method: 'PUT',
      url: `${base()}/reports/${REPORT_ID}/draft`,
      token: 'none',
      body: { notes: 'x' },
    });
    expect(res.statusCode).toBe(404);
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
  });

  it('submit: the same RPC as the signed-in route; the actor is the teacher’s account; audited', async () => {
    h.link.profileOf.mockResolvedValue('b0000000-0000-4000-8000-000000000002');
    h.reports.get
      .mockResolvedValueOnce(reportRow())
      .mockResolvedValueOnce(reportRow())
      .mockResolvedValue(submittedRow());
    const res = await h.call({
      method: 'POST',
      url: `${base()}/reports/${REPORT_ID}/submit`,
      token: 'none',
      body: FORM,
    });
    expect(res.statusCode).toBe(200);
    expect(h.reports.submit.mock.calls[0]?.[0]).toMatchObject({
      report_id: REPORT_ID,
      actor: 'b0000000-0000-4000-8000-000000000002',
    });
    expect(h.pdf.enqueue).toHaveBeenCalledWith(REPORT_ID);
    expect(h.link.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'teacher_link_submit',
        entityId: REPORT_ID,
        after: { teacher_id: TEACHER_ID, lesson_id: LESSON_ID, via: 'teacher_link' },
      }),
    );
  });

  it('a bad report id or body → 400; the signed-in routes still need a session', async () => {
    expect(
      (
        await h.call({
          method: 'PUT',
          url: `${base()}/reports/nope/draft`,
          token: 'none',
          body: {},
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await h.call({
          method: 'POST',
          url: `${base()}/reports/${REPORT_ID}/submit`,
          token: 'none',
          body: { attendance: 'x' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await h.call({ method: 'GET', url: `/lessons/${LESSON_ID}/report-form`, token: 'none' }))
        .statusCode,
    ).toBe(401);
  });
});
