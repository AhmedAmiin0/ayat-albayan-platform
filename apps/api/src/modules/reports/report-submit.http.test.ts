import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '../scheduling/errors';
import { AFTER, BEFORE, FULL_GRADES, LESSON_ID, lessonRow, REPORT_ID, reportRow, submittedRow, TEACHER } from './reports.fakes';
import { reportsApp } from './test-app';

const URL = `/reports/${REPORT_ID}/submit`;
const FORM = { attendance: 'on_time', grades: FULL_GRADES, overall: 'excellent', homework: 'سورة الملك', expectedVersion: 0 };
const DAY = 24 * 3_600_000;

describe('POST /reports/:id/submit (R3; R-REP-02/03/04)', () => {
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

  it('first submit: one RPC (form + version 1 + lesson completed), then alerts and the PDF', async () => {
    h.reports.get.mockResolvedValueOnce(reportRow()).mockResolvedValue(submittedRow());
    const res = await h.call({ method: 'POST', url: URL, body: FORM });
    expect(res.statusCode).toBe(200);
    const payload = h.reports.submit.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      report_id: REPORT_ID,
      expected_version: 0,
      actor: TEACHER.id,
      report: { attendance: 'on_time', grade_overall: 'excellent', homework: 'سورة الملك', notes: null, version: 1 },
      lesson_change: { changes: [{ id: LESSON_ID, from_status: 'scheduled', to_status: 'completed' }] },
    });
    expect(h.events.changed).toHaveBeenCalledWith([LESSON_ID]);
    expect(h.pdf.enqueue).toHaveBeenCalledWith(REPORT_ID);
    expect(res.json()).toMatchObject({ status: 'submitted', version: 1, pdf_status: 'pending' });
  });

  it('a failing PDF kick does not fail the committed submit', async () => {
    h.pdf.enqueue.mockRejectedValue(new Error('down'));
    expect((await h.call({ method: 'POST', url: URL, body: FORM })).statusCode).toBe(200);
  });

  it('the lesson already completed on the card → only the student row is synced if it differs', async () => {
    const marked = lessonRow().lesson_students.map((s) => ({ ...s, attendance: 'on_time' as const }));
    h.reports.lesson.mockResolvedValue(lessonRow({ status: 'completed', lesson_students: marked }));
    await h.call({ method: 'POST', url: URL, body: FORM });
    const payload = h.reports.submit.mock.calls[0]?.[0];
    expect(payload.lesson_change).toBeUndefined();
    expect(payload.student).toBeUndefined();
    expect(h.events.changed).toHaveBeenCalledWith([LESSON_ID]);
  });

  it.each([
    ['missing attendance', { ...FORM, attendance: undefined }, 'missing_attendance'],
    ['attended but ungraded', { attendance: 'late', expectedVersion: 0 }, 'missing_grades'],
  ])('%s → 400 validation_failed (%s)', async (_n, body, code) => {
    const res = await h.call({ method: 'POST', url: URL, body });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues.map((i: { message: string }) => i.message)).toEqual([code]);
    expect(h.reports.submit).not.toHaveBeenCalled();
  });

  it('stale form → 409 version_conflict', async () => {
    const res = await h.call({ method: 'POST', url: URL, body: { ...FORM, expectedVersion: 3 } });
    expect(res.json().code).toBe('version_conflict');
  });

  it('the race lost in the RPC → its 409 passes through', async () => {
    h.reports.submit.mockRejectedValue(conflict('version_conflict'));
    expect((await h.call({ method: 'POST', url: URL, body: FORM })).json().code).toBe('version_conflict');
    expect(h.events.changed).not.toHaveBeenCalled();
  });

  it('before the start → 409 not_started; cancelled lesson → 409 lesson_cancelled', async () => {
    vi.setSystemTime(BEFORE);
    expect((await h.call({ method: 'POST', url: URL, body: FORM })).json().code).toBe('not_started');
    vi.setSystemTime(AFTER);
    h.reports.lesson.mockResolvedValue(lessonRow({ status: 'cancelled_by_admin' }));
    expect((await h.call({ method: 'POST', url: URL, body: FORM })).json().code).toBe('lesson_cancelled');
    expect(h.reports.submit).not.toHaveBeenCalled();
  });

  it('an edit: the teacher within 24 h → version 2; after → 409 edit_window_closed; the admin always', async () => {
    h.reports.get.mockResolvedValue(submittedRow());
    h.reports.lesson.mockResolvedValue(lessonRow({ status: 'completed' }));
    const edit = { ...FORM, expectedVersion: 1 };
    vi.setSystemTime(new Date(AFTER.getTime() + DAY - 1000));
    expect((await h.call({ method: 'POST', url: URL, body: edit })).statusCode).toBe(200);
    expect(h.reports.submit.mock.calls[0]?.[0].report).toMatchObject({ version: 2, submitted_at: AFTER.toISOString() });
    vi.setSystemTime(new Date(AFTER.getTime() + DAY));
    expect((await h.call({ method: 'POST', url: URL, body: edit })).json().code).toBe('edit_window_closed');
    expect((await h.call({ method: 'POST', url: URL, body: edit, token: 'admin' })).statusCode).toBe(200);
  });

  it("another teacher's report → 403; unknown → 404", async () => {
    expect((await h.call({ method: 'POST', url: URL, body: FORM, token: 'other' })).statusCode).toBe(403);
    h.reports.get.mockResolvedValue(null);
    expect((await h.call({ method: 'POST', url: URL, body: FORM })).statusCode).toBe(404);
  });
});
