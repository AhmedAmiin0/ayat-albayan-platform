import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict, notFound } from '../scheduling/errors';
import { A, ADMIN, assistantApp, ID, STUDENT } from './assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;
const PUT = `/assistant-pay/terms/${A}`;
const SALARY = { amount: 1000, currency: 'SAR', startsOn: '2026-10-01' };
const row = (over: object = {}) => ({
  assistant_id: A, commission_type: 'percent', commission_value: 10, commission_currency: null, commission_starts_on: '2026-10-01',
  salary_amount: 1000, salary_currency: 'SAR', salary_starts_on: '2026-10-01', ...over,
});

describe('terms, ledger, void, adjustment and attribution (admin)', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.terms.isAssistant.mockResolvedValue(true);
    t.terms.get.mockResolvedValue(null);
    t.terms.upsert.mockImplementation(async (r: object) => ({ ...row(), ...r }));
    t.terms.uncommissioned.mockResolvedValue(['sub-1', 'sub-2']);
  });

  it('GET /terms lists every assistant with their terms, both null until set', async () => {
    t.terms.assistants.mockResolvedValue([{ id: A, full_name: 'الزهراء' }, { id: 'b', full_name: 'منى' }]);
    t.terms.all.mockResolvedValue([row()]);
    const res = await t.call({ method: 'GET', url: '/assistant-pay/terms', token: 'admin' });
    expect(res.json()).toEqual([
      { assistant_id: A, name: 'الزهراء', commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-10-01' }, salary: { amount: 1000, currency: 'SAR', starts_on: '2026-10-01' } },
      { assistant_id: 'b', name: 'منى', commission: null, salary: null },
    ]);
  });

  it('PUT /terms/:id writes both parts, audits before and after, then runs the rule for the students already brought', async () => {
    const res = await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: { type: 'percent', value: 10, startsOn: '2026-10-01' }, salary: SALARY } });
    expect(res.statusCode).toBe(200);
    expect(t.terms.upsert).toHaveBeenCalledWith(expect.objectContaining({
      assistant_id: A, commission_type: 'percent', commission_value: 10, commission_currency: null, commission_starts_on: '2026-10-01',
      salary_amount: 1000, salary_currency: 'SAR', salary_starts_on: '2026-10-01', updated_by: ADMIN,
    }));
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN, entity: 'assistant_terms', entityId: A, action: 'set' }));
    expect(t.rpc.evaluate.mock.calls).toEqual([['sub-1'], ['sub-2']]);
  });

  it('a fixed commission keeps its currency; a null part clears its columns and skips the rule run', async () => {
    await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: { type: 'fixed', value: 50, currency: 'EGP', startsOn: '2026-10-01' }, salary: null } });
    expect(t.terms.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ commission_type: 'fixed', commission_currency: 'EGP', salary_amount: null, salary_currency: null }));
    t.terms.upsert.mockImplementation(async (r: object) => ({ ...row(), ...r, commission_type: null, commission_value: null, commission_starts_on: null }));
    vi.mocked(t.rpc.evaluate).mockClear();
    const res = await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: null, salary: SALARY } });
    expect(res.json().commission).toBeNull();
    expect(t.rpc.evaluate).not.toHaveBeenCalled();
  });

  it('validation: fixed needs a currency, percent has none and is at most 100, dates are days; nothing written', async () => {
    const bad = [
      { commission: { type: 'fixed', value: 50, startsOn: '2026-10-01' }, salary: null },
      { commission: { type: 'percent', value: 10, currency: 'SAR', startsOn: '2026-10-01' }, salary: null },
      { commission: { type: 'percent', value: 101, startsOn: '2026-10-01' }, salary: null },
      { commission: { type: 'percent', value: 10, startsOn: 'soon' }, salary: null },
      { commission: null, salary: { amount: -1, currency: 'SAR', startsOn: '2026-10-01' } },
      { commission: null },
    ];
    for (const body of bad) expect([JSON.stringify(body), (await t.call({ method: 'PUT', url: PUT, token: 'admin', body })).statusCode]).toEqual([JSON.stringify(body), 400]);
    expect((await t.call({ method: 'PUT', url: '/assistant-pay/terms/not-a-uuid', token: 'admin', body: { commission: null, salary: null } })).statusCode).toBe(400);
    expect(t.terms.upsert).not.toHaveBeenCalled();
  });

  it('an unknown assistant: 404 assistant_not_found, nothing written', async () => {
    t.terms.isAssistant.mockResolvedValue(false);
    const res = await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: null, salary: null } });
    expect([res.statusCode, res.json().code]).toEqual([404, 'assistant_not_found']);
    expect(t.terms.upsert).not.toHaveBeenCalled();
  });

  it('GET /brought-by/:studentId: who brought the student and when; nobody gives nulls; an unknown student is 404', async () => {
    const url = `/assistant-pay/brought-by/${STUDENT}`;
    t.terms.broughtBy.mockResolvedValueOnce({ brought_by: A, brought_at: '2026-10-03T10:00:00Z', name: 'الزهراء' });
    expect((await t.call({ method: 'GET', url, token: 'admin' })).json()).toEqual({ assistant: { id: A, name: 'الزهراء' }, brought_at: '2026-10-03T10:00:00Z' });
    t.terms.broughtBy.mockResolvedValueOnce({ brought_by: null, brought_at: null, name: null });
    expect((await t.call({ method: 'GET', url, token: 'admin' })).json()).toEqual({ assistant: null, brought_at: null });
    t.terms.broughtBy.mockResolvedValueOnce(null);
    const res = await t.call({ method: 'GET', url, token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
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

  it('POST /adjustments: a signed amount in one currency; a repeat within a minute returns the first one', async () => {
    const body = { assistantId: A, amount: -50.5, currency: 'SAR', reason: 'خصم تأخير' };
    t.ledger.recentAdjustment.mockResolvedValue(null);
    t.rpc.adjust.mockResolvedValue('adj-1');
    const first = await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body });
    expect([first.statusCode, first.json()]).toEqual([201, { id: 'adj-1' }]);
    expect(t.rpc.adjust).toHaveBeenCalledWith({ ...body, actorId: ADMIN });
    t.ledger.recentAdjustment.mockResolvedValue('adj-1');
    vi.mocked(t.rpc.adjust).mockClear();
    expect((await t.call({ method: 'POST', url: '/assistant-pay/adjustments', token: 'admin', body })).json()).toEqual({ id: 'adj-1' });
    expect(t.rpc.adjust).not.toHaveBeenCalled();
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
