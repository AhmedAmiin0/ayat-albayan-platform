import { systemPermissionsOf } from '@ab/shared';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PermissionResolver } from '@/common/auth/permissions';
import { SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';

// GET /sales/packages/:id/cancel (whether «إلغاء الباقة» shows) and the key: subscriptions.stop,
// never subscriptions.write.

const url = `/sales/packages/${SUB_ID}/cancel`;

describe('GET /sales/packages/:id/cancel', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('an unused package: block null; nothing written', async () => {
    const res = await call({ method: 'GET', url, token: 'salesB' });
    expect([res.statusCode, res.json()]).toEqual([200, { subscriptionId: SUB_ID, block: null }]);
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });

  it('the POST’s refusal codes: has_lessons, has_payments, already_cancelled', async () => {
    const rows = [subRow(), subRow(), subRow({ status: 'cancelled' })];
    m.cancels.linkedLessons.mockResolvedValueOnce(1);
    m.subs.paid.mockResolvedValueOnce(new Map()).mockResolvedValueOnce(new Map([[SUB_ID, 9]]));
    const codes: unknown[] = [];
    for (const row of rows) {
      m.subs.get.mockResolvedValueOnce(row);
      codes.push((await call({ method: 'GET', url, token: 'salesA' })).json().block);
    }
    expect(codes).toEqual(['has_lessons', 'has_payments', 'already_cancelled']);
  });

  it('the system admin holds the key too; a teacher never', async () => {
    expect((await call({ method: 'GET', url, token: 'admin' })).statusCode).toBe(200);
    for (const method of ['GET', 'POST'] as const) {
      expect((await call({ method, url, token: 'teacher' })).statusCode).toBe(403);
    }
  });

  it('the sales role never holds subscriptions.write: the admin route stays 403 for her', async () => {
    expect(systemPermissionsOf('sales')).toContain('subscriptions.stop');
    expect(systemPermissionsOf('sales')).not.toContain('subscriptions.write');
    const admin = `/subscriptions/${SUB_ID}/cancel`;
    expect((await call({ method: 'POST', url: admin, token: 'salesA' })).statusCode).toBe(403);
  });
});

describe('without subscriptions.stop (a role it was switched off for)', () => {
  const withoutStop: PermissionResolver = async (user) =>
    (user.role ? systemPermissionsOf(user.role) : []).filter((p) => p !== 'subscriptions.stop');
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp(withoutStop)));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('403 for GET and POST; nothing read or written', async () => {
    for (const method of ['GET', 'POST'] as const) {
      expect((await call({ method, url, token: 'salesA' })).statusCode).toBe(403);
    }
    expect(m.subs.get).not.toHaveBeenCalled();
    expect(m.cancels.cancel).not.toHaveBeenCalled();
  });
});
