import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict, notFound } from '../../common/http/errors';
import { A, ADMIN, assistantApp, ID, STUDENT } from './assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;

describe('ledger, void, adjustment and attribution (admin)', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /commissions passes the filters; an unknown status or a bad date is 400', async () => {
    t.ledger.list.mockResolvedValue([]);
    const url = `/assistant-pay/commissions?assistantId=${A}&status=voided&from=2026-10-01T00:00:00Z`;
    expect((await t.call({ method: 'GET', url, token: 'admin' })).statusCode).toBe(200);
    expect(t.ledger.list).toHaveBeenCalledWith({ assistantId: A, status: 'voided', from: '2026-10-01T00:00:00Z' });
    for (const q of ['status=paid', 'from=yesterday', 'assistantId=x']) expect((await t.call({ method: 'GET', url: `/assistant-pay/commissions?${q}`, token: 'admin' })).statusCode).toBe(400);
  });

  it('POST /commissions/:id/void needs a reason and answers the RPC errors: 409 already_voided, 404 commission_not_found', async () => {
    t.rpc.voidCommission.mockResolvedValue(undefined);
    const ok = await t.call({ method: 'POST', url: `/assistant-pay/commissions/${ID}/void`, token: 'admin', body: { reason: 'خطأ في النسبة' } });
    expect([ok.statusCode, ok.json()]).toEqual([200, { id: ID }]);
    expect(t.rpc.voidCommission).toHaveBeenCalledWith({ commissionId: ID, reason: 'خطأ في النسبة', actorId: ADMIN });
    expect((await t.call({ method: 'POST', url: `/assistant-pay/commissions/${ID}/void`, token: 'admin', body: {} })).statusCode).toBe(400);
    t.rpc.voidCommission.mockRejectedValue(conflict('already_voided'));
    expect((await t.call({ method: 'POST', url: `/assistant-pay/commissions/${ID}/void`, token: 'admin', body: { reason: 'مرة ثانية' } })).statusCode).toBe(409);
    t.rpc.voidCommission.mockRejectedValue(notFound('commission_not_found'));
    expect((await t.call({ method: 'POST', url: `/assistant-pay/commissions/${ID}/void`, token: 'admin', body: { reason: 'غير موجود' } })).statusCode).toBe(404);
  });

  it('POST /adjustments: a signed amount in one currency; the request key goes to the RPC, which answers a retry with the first id', async () => {
    const body = { assistantId: A, amount: -50.5, currency: 'SAR', reason: 'خصم تأخير', requestId: ID };
    t.rpc.adjust.mockResolvedValue('adj-1');
    const first = await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body });
    expect([first.statusCode, first.json()]).toEqual([201, { id: 'adj-1' }]);
    expect(t.rpc.adjust).toHaveBeenCalledWith({ ...body, actorId: ADMIN });
    const retry = await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body });
    expect(retry.json()).toEqual({ id: 'adj-1' });
    expect(t.rpc.adjust).toHaveBeenCalledTimes(2); // no select-then-insert guard in the API: the database's unique key decides
  });

  it('POST /adjustments without a key still works (no replay protection); a key that is not a uuid is 400', async () => {
    t.rpc.adjust.mockResolvedValue('adj-2');
    const body = { assistantId: A, amount: 10, currency: 'SAR', reason: 'مكافأة' };
    expect((await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body })).statusCode).toBe(201);
    expect(t.rpc.adjust).toHaveBeenLastCalledWith({ ...body, actorId: ADMIN });
    expect((await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body: { ...body, requestId: 'x' } })).statusCode).toBe(400);
  });

  it('POST /adjustments validation: zero, a third decimal, a lower-case currency, no reason are 400', async () => {
    const ok = { assistantId: A, amount: 10, currency: 'SAR', reason: 'سبب' };
    for (const over of [{ amount: 0 }, { amount: 1.005 }, { currency: 'sar' }, { reason: '' }, { assistantId: 'x' }]) {
      expect((await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body: { ...ok, ...over } })).statusCode).toBe(400);
    }
    expect(t.rpc.adjust).not.toHaveBeenCalled();
  });

  it('POST /brought-by: one or many students, assistantId null clears; 500 at most; 409 commission_exists comes through', async () => {
    t.rpc.broughtBy.mockResolvedValue(2);
    const res = await t.call({ method: 'POST', url: '/assistant-pay/brought-by', token: 'admin', body: { studentIds: [STUDENT, ID], assistantId: null } });
    expect([res.statusCode, res.json()]).toEqual([200, { changed: 2 }]);
    expect(t.rpc.broughtBy).toHaveBeenCalledWith({ studentIds: [STUDENT, ID], assistantId: null, actorId: ADMIN });
    await t.call({ method: 'POST', url: '/assistant-pay/brought-by', token: 'admin', body: { studentIds: [STUDENT], assistantId: A, broughtAt: '2026-10-01T09:00:00Z' } });
    expect(t.rpc.broughtBy).toHaveBeenLastCalledWith({ studentIds: [STUDENT], assistantId: A, actorId: ADMIN, broughtAt: '2026-10-01T09:00:00Z' });
    const many = Array.from({ length: 501 }, (_, i) => `d1000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    for (const body of [{ studentIds: many, assistantId: A }, { studentIds: [], assistantId: A }, { studentIds: [STUDENT] }]) {
      expect((await t.call({ method: 'POST', url: '/assistant-pay/brought-by', token: 'admin', body })).statusCode).toBe(400);
    }
    t.rpc.broughtBy.mockRejectedValue(conflict('commission_exists'));
    const clash = await t.call({ method: 'POST', url: '/assistant-pay/brought-by', token: 'admin', body: { studentIds: [STUDENT], assistantId: A } });
    expect([clash.statusCode, clash.json().code]).toEqual([409, 'commission_exists']);
  });
});
