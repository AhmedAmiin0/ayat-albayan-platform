import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';
import {
  lessonRow,
  NOW,
  STUDENT,
  STUDENT_HEAD,
  TEACHER_ROW,
} from '@/modules/sales/sales-students/attendance/student-attendance.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const OTHER = '7c000000-0000-4000-8000-0000000000e2';
const url = (id: string) => `/teachers/me/students/${id}`;
const ME = { id: TEACHER_ROW, tz: 'Africa/Cairo', students: [{ id: STUDENT }] };
const MONEY_KEYS =
  /"(price|currency|amount|paid|unpaid|payment|invoice|renews_on|subscription_id|cancel_kind)"/;
/** The package as the database returns it, money and ids present; they must never leave. */
const PACKAGE = {
  id: 'sub-1', starts_on: '2026-10-01', created_at: '2026-09-30T10:00:00Z', status: 'active',
  cancel_kind: null, cancelled_at: null, lessons_total: 8, price: 290, renews_on: '2026-11-01',
};
const BALANCE = {
  subscription_id: 'sub-1', lessons_used: 3, remaining: 5, ended_at: null, projected_end_at: null,
};

describe('GET /teachers/me/students/:id — the student file head (docs/47)', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    t.me.me.mockResolvedValue(ME);
    t.attendance.packages.mockResolvedValue([PACKAGE]);
    t.roster.balances.mockResolvedValue([BALANCE]);
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  it('her student → 200 {id, code, name, status, course, upcoming}', async () => {
    t.attendance.lessons.mockResolvedValue([
      lessonRow('later', '2026-11-02T15:00:00+00:00', { status: 'scheduled' }),
      lessonRow('next', '2026-10-29T15:00:00+00:00', { status: 'cancelled_by_admin', cancel_reason: 'عطلة' }),
    ]);
    const res = await t.call('GET', url(STUDENT), { token: 'teacher' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Object.keys(body).sort()).toEqual(['code', 'course', 'id', 'name', 'status', 'upcoming']);
    expect([body.id, body.code, body.name, body.status]).toEqual(Object.values(STUDENT_HEAD));
    expect(body.course).toEqual({
      starts_on: '2026-10-01', stopped_at: null, ended_at: null, projected_end_at: null,
      lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
    });
    expect(body.upcoming.map((r: { lesson_id: string }) => r.lesson_id)).toEqual(['next', 'later']);
    expect(body.upcoming[0]).toMatchObject({ kind: null, cancel_reason: 'عطلة' });
    const to = new Date(NOW.getTime() + 14 * 86_400_000);
    const window = { from: NOW, to, teacherId: TEACHER_ROW };
    expect(t.attendance.lessons).toHaveBeenCalledWith(STUDENT, window);
    expect(t.roster.balances).toHaveBeenCalledWith(['sub-1']);
  });

  it('no price, payment, package id, status, renews_on, cancel kind or cancel text', async () => {
    t.attendance.packages.mockResolvedValue([
      { ...PACKAGE, status: 'cancelled', cancel_kind: 'stopped', cancelled_at: '2026-10-20T08:00:00Z' },
    ]);
    const res = await t.call('GET', url(STUDENT), { token: 'teacher' });
    expect(res.body).not.toMatch(MONEY_KEYS);
    expect(res.body).not.toMatch(/sub-1|290|"stopped"/);
    const courseKeys = Object.keys(res.json().course);
    expect(courseKeys.filter((k) => ['id', 'status', 'cancel_reason'].includes(k))).toEqual([]);
    expect(res.json().course.stopped_at).toBe('2026-10-20T08:00:00.000Z');
  });

  it('without a package that counts: course null', async () => {
    t.attendance.packages.mockResolvedValue([]);
    t.roster.balances.mockResolvedValue([]);
    expect((await t.call('GET', url(STUDENT), { token: 'teacher' })).json().course).toBeNull();
  });

  it('not hers → 404 student_not_found, nothing read; unlinked → 404 teacher_not_linked', async () => {
    const res = await t.call('GET', url(OTHER), { token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(t.attendance.student).not.toHaveBeenCalled();
    t.me.me.mockResolvedValue(null);
    const unlinked = await t.call('GET', url(STUDENT), { token: 'teacher' });
    expect([unlinked.statusCode, unlinked.json().code]).toEqual([404, 'teacher_not_linked']);
  });

  it('a student row gone meanwhile → 404; a malformed id → 400', async () => {
    t.attendance.student.mockResolvedValue(null);
    expect((await t.call('GET', url(STUDENT), { token: 'teacher' })).statusCode).toBe(404);
    expect((await t.call('GET', url('nope'), { token: 'teacher' })).statusCode).toBe(400);
  });

  it('teachers only: sales, the admin and the classroom assistant are 403', async () => {
    for (const token of ['salesA', 'admin', 'assistant'] as const) {
      expect([token, (await t.call('GET', url(STUDENT), { token })).statusCode]).toEqual([token, 403]);
    }
  });
});
