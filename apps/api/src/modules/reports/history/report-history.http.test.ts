import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, TEACHER_ID } from '../reports.fakes';
import { reportsApp } from '../test-app';

const URL = `/students/${STUDENT_ID}/reports`;

describe('GET /students/:id/reports (R5; R-REP-05) and /teachers/me/pending-reports (R11; R-TCH-03)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it('admin: the page shape with the series; page params validated', async () => {
    h.history.student.mockResolvedValue({ teacher_id: null });
    const res = await h.call({ method: 'GET', url: `${URL}?page=2&pageSize=10`, token: 'admin' });
    expect(res.json()).toEqual({ items: [], total: 0, page: 2, pageSize: 10, series: [] });
    expect((await h.call({ method: 'GET', url: `${URL}?pageSize=500`, token: 'admin' })).statusCode).toBe(400);
  });

  it('teacher: their assigned student, or one they taught; else 403', async () => {
    h.history.student.mockResolvedValue({ teacher_id: TEACHER_ID });
    expect((await h.call({ method: 'GET', url: URL })).statusCode).toBe(200);
    h.history.student.mockResolvedValue({ teacher_id: null });
    h.history.taught.mockResolvedValue(true);
    expect((await h.call({ method: 'GET', url: URL })).statusCode).toBe(200);
    expect(h.history.taught).toHaveBeenCalledWith({ teacherId: TEACHER_ID, studentId: STUDENT_ID });
    h.history.taught.mockResolvedValue(false);
    expect((await h.call({ method: 'GET', url: URL })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: URL, token: 'guardian' })).statusCode).toBe(403);
  });

  it('unknown student → 404', async () => {
    h.history.student.mockResolvedValue(null);
    expect((await h.call({ method: 'GET', url: URL, token: 'admin' })).statusCode).toBe(404);
  });

  it('pending: the teacher’s own, mapped; admin 403; unlinked login 404 teacher_not_linked', async () => {
    h.history.pending.mockResolvedValue([
      { lesson_id: 'l1', student: { id: 's1', code: 'AB-0001', name: 'سهيلة' }, lessons: { starts_at: '2026-10-04T14:00:00+00:00', status: 'completed' }, lesson_reports: null },
    ]);
    const res = await h.call({ method: 'GET', url: '/teachers/me/pending-reports' });
    expect(res.json()).toEqual([
      { lesson_id: 'l1', starts_at: '2026-10-04T14:00:00.000Z', status: 'completed', student: { id: 's1', code: 'AB-0001', name: 'سهيلة' }, report_id: null },
    ]);
    expect(h.history.pending).toHaveBeenCalledWith(TEACHER_ID, expect.any(Date));
    expect((await h.call({ method: 'GET', url: '/teachers/me/pending-reports', token: 'admin' })).statusCode).toBe(403);
    h.teachers.idByProfile.mockResolvedValue(null);
    const unlinked = await h.call({ method: 'GET', url: '/teachers/me/pending-reports' });
    expect(unlinked.statusCode).toBe(404);
    expect(unlinked.json().code).toBe('teacher_not_linked');
  });
});
