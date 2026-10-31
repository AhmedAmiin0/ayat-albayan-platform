import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON, MINE, REPORT, studentsApp } from '../sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;

// Owner 2026-10-28: «تفاصيل الطالب» opens ANY student; 2026-10-30: salesB reads salesA's student (MINE) in full.
describe('GET /sales/students/:id of another salesperson\'s student (docs/16 row 36)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());
  afterEach(() => vi.useRealTimers());

  it('200 with mine = false: the same student, attendance, «الجدول», subscriptions and reports as hers', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const hers = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json();
    expect({ ...body, mine: true, schedule: null }).toEqual({ ...hers, schedule: null });
    expect(body).toMatchObject({ mine: false, current_id: expect.any(String), reports: { total: 1 } });
    expect(body.subscriptions.length).toBeGreaterThan(0);
    expect(body.student).toMatchObject({ id: MINE, name: 'ياسمين', guardian_phone: '+966551110000' });
    expect(body.attendance.totals).toEqual({ present: 1, absent: 1, excused: 0, cancelled: 1, unmarked: 1 });
    expect(body.schedule.weekly).toHaveLength(1);
    expect(body.schedule.upcoming[0].students[0].mine).not.toBe(true);
    expect(res.body).not.toMatch(/سر|secret|\+20|bank/);
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

  it('the report PDF opens for another\'s student; moving or cancelling another\'s lesson is allowed', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-27T10:00:00Z'), toFake: ['Date'] }); // before the lesson ends
    const pdf = await t.call('GET', `/sales/students/${MINE}/reports/${REPORT}/pdf`, { token: 'salesB' });
    expect(pdf.statusCode).toBe(200);
    expect(t.files.studentPdfUrl).toHaveBeenCalledWith({ id: REPORT, studentId: MINE });
    const move = await t.call('POST', `/sales/lessons/${LESSON}/reschedule`, { token: 'salesB', body: { startsAt: '2099-01-01T10:00:00.000Z' } });
    const cancel = await t.call('POST', `/sales/lessons/${LESSON}/cancel`, { token: 'salesB', body: {} });
    expect([move.statusCode, cancel.statusCode]).toEqual([200, 200]);
    expect(t.lessons.one.reschedule).toHaveBeenCalledWith(expect.objectContaining({ lessonId: LESSON, actor: expect.objectContaining({ role: 'sales' }) }));
    expect(t.lessons.cancels.cancel).toHaveBeenCalledWith(expect.objectContaining({ lessonId: LESSON }));
  });
});
