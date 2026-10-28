import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LESSON, MINE, REPORT, studentsApp } from '../sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const SECRET = /price|currency|fx_|amount|method|note|rate|meeting|link|receipt|payment|secret|سر/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];

// Owner 2026-10-28: «تفاصيل الطالب» opens ANY student; salesB reads salesA's student (MINE) as not hers.
describe('GET /sales/students/:id of another salesperson\'s student (docs/16 row 36)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('200 with mine = false: student, trial, attendance and «الجدول»; no subscription or report, neither read', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ mine: false, subscriptions: [], current_id: null, reports: { items: [], total: 0 } });
    expect(body.student).toMatchObject({ id: MINE, name: 'ياسمين', guardian_phone: '+966551110000' });
    expect(body.attendance.totals).toEqual({ present: 1, absent: 1, excused: 0, cancelled: 1, unmarked: 1 });
    expect(body.schedule.weekly).toHaveLength(1);
    expect(body.schedule.upcoming[0].students[0].mine).not.toBe(true);
    expect(t.history.history).not.toHaveBeenCalled();
    expect(t.reports.submitted).not.toHaveBeenCalled();
    expect(keys(body).filter((k) => SECRET.test(k))).toEqual([]);
    expect(res.body).not.toMatch(/سر|secret|\+20|SAR|bank/);
  });

  it('the trial (as «مواعيد الحلقة التجريبية» finds it): every date newest first, a moved one kept, its outcome and the teacher', async () => {
    const { trial } = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' })).json();
    expect(trial).toEqual([
      { lesson_id: 't1', starts_at: '2026-09-03T15:00:00.000Z', status: 'completed', outcome: 'attended', teacher_name: 'أبرار' },
      { lesson_id: 't0', starts_at: '2026-09-01T15:00:00.000Z', status: 'rescheduled', outcome: 'moved', teacher_name: 'أبرار' },
    ]);
    expect(t.queries.trialDates.trialLessons).toHaveBeenCalledWith(MINE);
    t.queries.trialDates.trialLessons.mockResolvedValue([]);
    expect((await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json().trial).toEqual([]);
  });

  it('mine-only stays mine: the report PDF is 404, moving or cancelling a lesson 403 not_your_student', async () => {
    const pdf = await t.call('GET', `/sales/students/${MINE}/reports/${REPORT}/pdf`, { token: 'salesB' });
    expect([pdf.statusCode, pdf.json().code]).toEqual([404, 'student_not_found']);
    expect(t.files.studentPdfUrl).not.toHaveBeenCalled();
    const move = await t.call('POST', `/sales/lessons/${LESSON}/reschedule`, { token: 'salesB', body: { startsAt: '2099-01-01T10:00:00.000Z' } });
    const cancel = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesB', body: {} });
    expect([move.statusCode, move.json().code, cancel.statusCode, cancel.json().code]).toEqual([403, 'not_your_student', 403, 'not_your_student']);
    expect(t.lessons.one.reschedule).not.toHaveBeenCalled();
    expect(t.lessons.cancels.cancel).not.toHaveBeenCalled();
  });
});
