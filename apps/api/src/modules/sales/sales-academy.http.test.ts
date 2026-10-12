import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { academyApp, bundle, liveRow, studentRow, SUB, teacherRow } from './sales-academy.fakes';

type App = Awaited<ReturnType<typeof academyApp>>;
const SECRET = /price|currency|fx_|amount|method|note|rate|phone|meeting|link|receipt|balance|remaining_amount|package_remaining|secret|سر/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];
const ROUTES = ['/sales/teachers', '/sales/students/all', '/sales/live', '/sales/schedule', `/sales/subscriptions/${SUB}/history`];

describe('the sales assistant side over HTTP (docs/16)', () => {
  let t: App;
  beforeAll(async () => {
    t = await academyApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.academy.teachers.mockResolvedValue([teacherRow()]);
    t.academy.students.mockResolvedValue({ rows: [studentRow()], total: 41 });
    t.academy.live.mockResolvedValue([liveRow()]);
    t.history.history.mockResolvedValue(bundle());
    vi.clearAllMocks();
  });

  it('every route answers a salesperson and refuses admin, teacher, classroom assistant and guardian (403)', async () => {
    for (const url of ROUTES) {
      expect([url, (await t.get(url, 'salesA')).statusCode]).toEqual([url, 200]);
      for (const token of ['admin', 'teacher', 'assistant', 'guardian'] as const) {
        expect([url, token, (await t.get(url, token)).statusCode]).toEqual([url, token, 403]);
      }
    }
  });

  it('GET /sales/teachers: name, gender, programs, counts, the fixed link and current students; never pay or phone', async () => {
    const res = await t.get('/sales/teachers', 'salesB');
    expect(res.json()).toEqual([
      {
        id: 'tc1', name: 'أبرار', name_en: 'Abrar', gender: 'female', programs: ['quran'], lessons_today: 1, live_now: false,
        active_count: 1, trial_count: 0, meeting_link: 'https://meet.example.org/abrar',
        students: [{ id: 's1', code: 'AB-0101', name: 'ياسمين', program: 'quran', status: 'active', next_lesson_at: '2026-10-12T15:00:00.000Z' }],
      },
    ]);
    // The one exception to «never a link» (owner 2026-10-12, docs/16 rows 3 and 10): the teacher's fixed link.
    expect(keys(res.json()).filter((k) => SECRET.test(k))).toEqual(['meeting_link']);
    expect(res.body).not.toMatch(/rate_|phone|notes|max_students|calendar/);
  });

  it('GET /sales/students/all: paged and searchable, whitelisted columns only', async () => {
    const res = await t.get('/sales/students/all?page=2&pageSize=20&search=%D9%8A%D8%A7%D8%B3', 'salesA');
    expect(t.academy.students).toHaveBeenCalledWith({ page: 2, pageSize: 20, search: 'ياس' });
    expect(res.json()).toEqual({
      items: [{ id: 's1', code: 'AB-0101', name: 'ياسمين', status: 'active', program: 'quran', teacher_name: 'أبرار', guardian_name: 'أم ياسمين' }],
      total: 41, page: 2, pageSize: 20,
    });
    expect(res.body).not.toMatch(SECRET);
    expect((await t.get('/sales/students/all?pageSize=500', 'salesA')).statusCode).toBe(400);
  });

  it('GET /sales/live: the assistant row shape, no meeting link', async () => {
    const res = await t.get('/sales/live', 'salesA');
    expect(res.json()).toEqual([
      { lesson_id: 'les-1', starts_at: '2026-10-11T16:00:00.000Z', ends_at: '2026-10-11T16:30:00.000Z', status: 'confirmed', teacher_name: 'أبرار', student_names: ['ياسمين'] },
    ]);
    expect(t.academy.live).toHaveBeenCalledWith(expect.any(Date));
  });

  it('GET history: her subscription opens with status changes, lessons and payment dates and amounts, no other money', async () => {
    const res = await t.get(`/sales/subscriptions/${SUB}/history`, 'salesA');
    const body = res.json();
    expect(body.subscription_id).toBe(SUB);
    expect(body.subscriptions.map((s: { id: string }) => s.id)).toEqual(['old', SUB]);
    expect(body.subscriptions[1]).toMatchObject({ lessons_used: 3, lessons_remaining: 5, payments: [{ id: 'p1', paid_at: '2026-09-02T09:00:00Z', kind: 'payment', amount: 290, currency: 'SAR' }] });
    expect(keys(body).filter((k) => SECRET.test(k)).sort()).toEqual(['amount', 'currency']);
    expect(res.body).not.toMatch(/bank|price|سر/);
  });

  it('GET history: another salesperson, or an unknown id, is 404 subscription_not_found; a bad id is 400', async () => {
    const other = await t.get(`/sales/subscriptions/${SUB}/history`, 'salesB');
    expect([other.statusCode, other.json().code]).toEqual([404, 'subscription_not_found']);
    const unknown = await t.get('/sales/subscriptions/c1000000-0000-4000-8000-0000000000ff/history', 'salesA');
    expect([unknown.statusCode, unknown.json().code]).toEqual([404, 'subscription_not_found']);
    expect(t.history.history).not.toHaveBeenCalled();
    expect(other.body).not.toMatch(/290|SAR|amount/);
    expect((await t.get('/sales/subscriptions/nope/history', 'salesA')).statusCode).toBe(400);
  });
});
