import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MINE, studentsApp } from '@/modules/sales/sales-students/sales-students.fakes';

type App = Awaited<ReturnType<typeof studentsApp>>;
const SECRET = /fx_|amount|payment|receipt|commission|note|secret|سر/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];

/** As the database could return them, with money columns present: none may leave. */
const pkg = (id: string, over: Record<string, unknown> = {}) => ({
  id, student_id: MINE, package: '12', status: 'active', starts_on: '2026-10-01', renews_on: null,
  lessons_total: 12, created_at: '2026-09-30T10:00:00Z', price: 290, currency: 'SAR', notes: 'سر', ...over,
});
const balance = {
  subscription_id: 'sub2', lessons_used: 5, remaining: 7, ended_at: null,
  projected_end_at: '2026-11-20T08:00:00+00:00', lessons_used_before: 2, commission: 40,
};

// Owner 2026-10-30: «Why i cant see the subscription lessoons and ststus of this user».
describe('GET /sales/students/:id: the current package of ANY student', () => {
  let t: App;
  beforeAll(async () => {
    t = await studentsApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    t.reset();
    t.roster.packages.mockResolvedValue([pkg('sub2'), pkg('sub1', { status: 'ended', starts_on: '2026-09-01' })]);
    t.roster.balances.mockResolvedValue([balance]);
  });

  it('another assistant\'s student (salesB): size, status, dates, lessons used / left, expected end', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' });
    expect(res.statusCode).toBe(200);
    expect(res.json().package).toEqual({
      id: 'sub2', package: '12', status: 'active', starts_on: '2026-10-01', renews_on: null,
      ended_at: null, projected_end_at: '2026-11-20T08:00:00+00:00', created_at: '2026-09-30T10:00:00Z',
      lessons_total: 12, lessons_used: 5, lessons_remaining: 7,
    });
    expect(t.roster.packages).toHaveBeenCalledWith([MINE]);
    expect(t.roster.balances).toHaveBeenCalledWith(['sub2']);
  });

  it('another\'s student: subscriptions and reports as for hers (owner 2026-10-30); never a commission', async () => {
    const res = await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' });
    const body = res.json();
    expect(body.mine).toBe(false);
    expect(body.subscriptions.length).toBeGreaterThan(0);
    expect(body.reports.total).toBe(1);
    expect(keys(body).filter((k) => SECRET.test(k))).toEqual([]);
    expect(res.body).not.toMatch(/سر|commission/);
    expect(t.history.history).toHaveBeenCalledWith(MINE);
    expect(t.queries.prices).toHaveBeenCalledWith(MINE);
  });

  it('her own student keeps the subscriptions and also gets the summary; none: package null', async () => {
    const own = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesA' })).json();
    expect(own.mine).toBe(true);
    expect(own.subscriptions.length).toBeGreaterThan(0);
    expect(own.package.id).toBe('sub2');
    t.roster.packages.mockResolvedValue([pkg('sub3', { status: 'cancelled' })]);
    const none = (await t.call('GET', `/sales/students/${MINE}`, { token: 'salesB' })).json();
    expect(none.package).toBeNull();
    expect(t.roster.balances).toHaveBeenLastCalledWith([]);
  });

  it('admin, teacher and the classroom assistant: still 403, nothing read', async () => {
    for (const token of ['admin', 'teacher', 'assistant'] as const) {
      expect((await t.call('GET', `/sales/students/${MINE}`, { token })).statusCode).toBe(403);
    }
    expect(t.roster.packages).not.toHaveBeenCalled();
  });
});
