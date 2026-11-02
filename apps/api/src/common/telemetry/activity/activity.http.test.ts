import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { EXPENSE_ID, expenseRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { ActivityRepo } from './activity.repo';
import { ActivityWriter } from './activity.writer';

describe('activity log over HTTP (real AppModule, interceptor and guards)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  let push: MockInstance<ActivityWriter['push']>;
  let list: MockInstance<ActivityRepo['list']>;

  beforeAll(async () => {
    ({ app, m, call } = await moneyApp());
    push = vi.spyOn(app.get(ActivityWriter), 'push').mockImplementation(() => undefined);
    list = vi.spyOn(app.get(ActivityRepo), 'list').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
  });
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    push.mockClear();
    list.mockClear();
  });

  it('records a create with the route pattern, created id and field names; reads are not recorded', async () => {
    m.expenses.insert.mockResolvedValue(expenseRow());
    const res = await call({ method: 'POST', url: '/expenses?x=secret', body: { month: '2026-09', category: 'ads', amount: 8000 } });
    expect(res.statusCode).toBe(201);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expect.objectContaining({
      actor_id: ADMIN.id, actor_role: 'admin', action: 'expenses.create', method: 'POST', route: '/expenses',
      entity: 'expenses', entity_id: EXPENSE_ID, status: 201, meta: { fields: ['month', 'category', 'amount'] },
    }));
    m.expenses.between.mockResolvedValue([]);
    await call({ method: 'GET', url: '/expenses?month=2026-09' });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('records the error status of a failed mutation (404, 400)', async () => {
    m.expenses.get.mockResolvedValue(null);
    await call({ method: 'PATCH', url: `/expenses/${EXPENSE_ID}`, body: { amount: 1 } });
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({
      action: 'expenses.update', route: '/expenses/:id', entity_id: EXPENSE_ID, status: 404,
    }));
    await call({ method: 'DELETE', url: '/expenses/not-a-uuid' });
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({ status: 400, entity_id: 'not-a-uuid' }));
  });

  it('GET /activity is admin only and passes the parsed filters', async () => {
    const res = await call({ method: 'GET', url: '/activity?entity=students&result=error&sort=at&dir=desc' });
    expect(res.statusCode).toBe(200);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ entity: 'students', result: 'error', sort: 'at', dir: 'desc', page: 1 }));
    expect((await call({ method: 'GET', url: '/activity?result=maybe' })).statusCode).toBe(400);
    expect((await call({ method: 'GET', url: '/activity', token: 'teacher' })).statusCode).toBe(403);
    expect(push).not.toHaveBeenCalled();
  });

  it('records sign-in and sign-out reported by the web', async () => {
    expect((await call({ method: 'POST', url: '/activity/session/login', token: 'teacher' })).statusCode).toBe(204);
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'authSession.login', actor_role: 'teacher', status: 204 }));
    await call({ method: 'POST', url: '/activity/session/logout' });
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'authSession.logout', actor_role: 'admin' }));
  });

  it('a failed sign-in is public, stores no body, and is rate-limited per IP without flooding the log', async () => {
    const failed = () =>
      app.inject({ method: 'POST', url: '/activity/session/login-failed', payload: { email: 'x@y.z', password: 'p' } });
    expect((await failed()).statusCode).toBe(204);
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'authSession.loginFailed', actor_id: null, actor_role: 'public' }));
    expect(JSON.stringify(push.mock.calls)).not.toMatch(/x@y\.z|"p"/);
    for (let i = 0; i < 25; i += 1) await failed();
    expect((await failed()).statusCode).toBe(429);
    expect(push).toHaveBeenCalledTimes(20);
  });
});
