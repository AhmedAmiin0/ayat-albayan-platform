import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MINE, OTHER, REPORT, studentsApp } from '../sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const SECRET = /price|currency|fx_|amount|method|note|rate|phone|meeting|link|receipt|payment|secret|سر/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];

describe('GET /sales/students/:id «تفاصيل الطالب» (docs/16 row 36)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('her own student: 200 with the student, the subscriptions newest first and the current one', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.student).toEqual({ id: MINE, code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', teacher_name: 'أبرار' });
    expect(body.subscriptions.map((s: { id: string }) => s.id)).toEqual(['c1000000-0000-4000-8000-0000000000c1', 'old']);
    expect(body.subscriptions[0]).toEqual({
      id: 'c1000000-0000-4000-8000-0000000000c1', package: '8', status: 'active', starts_on: '2026-09-01', renews_on: '2026-10-01',
      ended_at: null, created_at: '2026-09-01T10:00:00Z', lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
    });
    expect(body.current_id).toBe('c1000000-0000-4000-8000-0000000000c1');
  });

  it('attendance: her own mark per lesson (حضر / غاب / ملغاة / لم تُسجَّل), a moved lesson left out, with totals', async () => {
    const { attendance } = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json();
    expect(attendance.items).toEqual([
      { lesson_id: 'l4', starts_at: '2026-10-20T15:00:00.000Z', kind: 'unmarked' },
      { lesson_id: 'l3', starts_at: '2026-10-18T15:00:00.000Z', kind: 'cancelled' },
      { lesson_id: 'l2', starts_at: '2026-10-15T15:00:00.000Z', kind: 'absent' },
      { lesson_id: 'l1', starts_at: '2026-10-11T15:00:00.000Z', kind: 'present' },
    ]);
    expect(attendance.totals).toEqual({ present: 1, absent: 1, excused: 0, cancelled: 1, unmarked: 1 });
    expect(t.queries.pastLessons).toHaveBeenCalledWith(MINE, expect.any(Date));
  });

  it('reports: the teacher\'s rows (date, lesson number, grade, PDF state), newest first', async () => {
    const { reports } = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json();
    expect(reports).toEqual({
      total: 1,
      items: [{
        id: REPORT, lesson_id: 'l1', starts_at: '2026-10-11T15:00:00.000Z', lesson_no: 12, teacher: { id: 'tc1', display_name_ar: 'أبرار' },
        attendance: 'on_time', grade_overall: 'excellent', status: 'submitted', version: 1, pdf_status: 'ready', sent_at: '2026-10-11T16:00:00Z',
      }],
    });
  });

  it('no money, note, phone or link anywhere in the payload', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' });
    expect(keys(res.json()).filter((k) => SECRET.test(k))).toEqual([]);
    expect(res.body).not.toMatch(/سر|secret|\+20|290|SAR|bank/);
  });

  it('another family\'s student, another salesperson or an unknown id: 404 student_not_found, nothing read', async () => {
    for (const [id, token] of [[OTHER, 'salesA'], [MINE, 'salesB']] as const) {
      const res = await t.call('GET', `/sales/students/${id}`, { token });
      expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    }
    expect(t.queries.student).not.toHaveBeenCalled();
    expect(t.history.history).not.toHaveBeenCalled();
    expect(t.reports.submitted).not.toHaveBeenCalled();
    expect((await t.call('GET', '/sales/students/nope', { token: 'salesA' })).statusCode).toBe(400);
  });

  it('only a salesperson: admin, teacher and the classroom assistant are 403', async () => {
    for (const token of ['admin', 'teacher', 'assistant'] as const) {
      expect([token, (await t.call('GET', `/sales/students/${MINE}`, { token })).statusCode]).toEqual([token, 403]);
    }
  });

  it('report PDF: signed for her student\'s report; another student is 404 before any signing', async () => {
    const own = await t.call('GET', `/sales/students/${MINE}/reports/${REPORT}/pdf`, { token: 'salesA' });
    expect(own.json()).toEqual({ url: 'https://storage/signed', expires_at: '2026-10-27T16:00:00.000Z' });
    expect(t.files.studentPdfUrl).toHaveBeenCalledWith({ id: REPORT, studentId: MINE });
    t.files.studentPdfUrl.mockClear();
    expect((await t.call('GET', `/sales/students/${OTHER}/reports/${REPORT}/pdf`, { token: 'salesA' })).statusCode).toBe(404);
    expect((await t.call('GET', `/sales/students/${MINE}/reports/${REPORT}/pdf`, { token: 'teacher' })).statusCode).toBe(403);
    expect(t.files.studentPdfUrl).not.toHaveBeenCalled();
  });
});
