import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON_ID, REPORT_ID, STUDENT_ID, TEACHER_ID } from './reports.fakes';
import { reportsApp } from './test-app';
import type { TeacherReportRow } from './teacher-reports.queries';

const HOUR = 3_600_000;
const row = (over: Partial<TeacherReportRow>): TeacherReportRow => ({
  ...{ id: REPORT_ID, lesson_id: LESSON_ID, student_id: STUDENT_ID, attendance: 'on_time', grade_overall: 'excellent' },
  ...{ status: 'submitted', submitted_at: new Date(Date.now() - HOUR).toISOString(), pdf_status: 'ready', sent_at: null },
  ...over,
});

describe('GET /teachers/me/reports (teacher mode «التقارير», R-REP-02, R-TCH-03)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    const old = new Date(Date.now() - 48 * HOUR).toISOString();
    h.mine.page.mockResolvedValue({ rows: [row({}), row({ id: 'r-old', submitted_at: old })], total: 12 });
    h.history.lessons.mockResolvedValue([{ id: LESSON_ID, starts_at: '2026-10-04 14:00:00+00', teacher: null }]);
    h.mine.students.mockResolvedValue([{ id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' }]);
  });

  it('my submitted reports only, in the query’s newest-first order, as a page', async () => {
    const res = await h.call({ method: 'GET', url: '/teachers/me/reports?page=2&pageSize=10' });
    expect(res.statusCode).toBe(200);
    expect(h.mine.page).toHaveBeenCalledWith({ teacherId: TEACHER_ID, filter: {}, page: { page: 2, pageSize: 10 } });
    const body = res.json();
    expect(body).toMatchObject({ total: 12, page: 2, pageSize: 10 });
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([REPORT_ID, 'r-old']);
    expect(body.items[0]).toMatchObject({
      lesson_id: LESSON_ID,
      starts_at: '2026-10-04T14:00:00.000Z',
      student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' },
      ...{ attendance: 'on_time', grade_overall: 'excellent', status: 'submitted', pdf_status: 'ready' },
    });
    expect(h.history.lessons).toHaveBeenCalledWith([LESSON_ID, LESSON_ID]);
  });

  it('can_edit inside the 24 h window (with edit_until), not after it', async () => {
    const [fresh, old] = (await h.call({ method: 'GET', url: '/teachers/me/reports' })).json().items;
    expect(fresh.can_edit).toBe(true);
    expect(Date.parse(fresh.edit_until) - Date.parse(fresh.submitted_at)).toBe(24 * HOUR);
    expect(old.can_edit).toBe(false);
  });

  it("another teacher reads only their own (scoped by the login, no id to tamper with)", async () => {
    await h.call({ method: 'GET', url: '/teachers/me/reports', token: 'other' });
    expect(h.mine.page).toHaveBeenCalledWith({ teacherId: 'other', filter: {}, page: { page: 1, pageSize: 25 } });
  });

  it('teacher only: admin and guardian 403; page params validated', async () => {
    expect((await h.call({ method: 'GET', url: '/teachers/me/reports', token: 'admin' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: '/teachers/me/reports', token: 'guardian' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: '/teachers/me/reports?pageSize=500' })).statusCode).toBe(400);
  });
});
