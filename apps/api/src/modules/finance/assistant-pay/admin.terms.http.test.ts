import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { badRequest } from '../../../common/http/errors';
import { A, ADMIN, assistantApp, STUDENT } from './assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;
const PUT = `/assistant-pay/terms/${A}`;
const SALARY = { amount: 1000, currency: 'SAR', startsOn: '2026-10-01' };
const row = (over: object = {}) => ({
  assistant_id: A, commission_type: 'percent', commission_value: 10, commission_currency: null, commission_starts_on: '2026-10-01',
  salary_amount: 1000, salary_currency: 'SAR', salary_starts_on: '2026-10-01', ...over,
});

describe('terms and attribution of one student (admin)', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.terms.isAssistant.mockResolvedValue(true);
    t.terms.get.mockResolvedValue(null);
    t.rpc.setTerms.mockResolvedValue(undefined);
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

  it('PUT /terms/:id writes both parts through the RPC, audits before and after, then runs the rule for the students already brought', async () => {
    t.terms.get.mockResolvedValueOnce(null).mockResolvedValueOnce(row());
    const res = await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: { type: 'percent', value: 10, startsOn: '2026-10-01' }, salary: SALARY } });
    expect(res.statusCode).toBe(200);
    expect(t.rpc.setTerms).toHaveBeenCalledWith({
      assistantId: A, actorId: ADMIN,
      columns: expect.objectContaining({
        assistant_id: A, commission_type: 'percent', commission_value: 10, commission_currency: null, commission_starts_on: '2026-10-01',
        salary_amount: 1000, salary_currency: 'SAR', salary_starts_on: '2026-10-01', updated_by: ADMIN,
      }),
    });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: ADMIN, entity: 'assistant_terms', entityId: A, action: 'set' }));
    expect(t.rpc.evaluate.mock.calls).toEqual([['sub-1'], ['sub-2']]);
  });

  it('a fixed commission keeps its currency; a null part clears its columns and skips the rule run', async () => {
    t.terms.get.mockResolvedValue(row({ commission_type: 'fixed', commission_value: 50, commission_currency: 'EGP', salary_amount: null, salary_currency: null, salary_starts_on: null }));
    await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: { type: 'fixed', value: 50, currency: 'EGP', startsOn: '2026-10-01' }, salary: null } });
    expect(t.rpc.setTerms).toHaveBeenLastCalledWith(expect.objectContaining({
      columns: expect.objectContaining({ commission_type: 'fixed', commission_currency: 'EGP', salary_amount: null, salary_currency: null }),
    }));
    t.terms.get.mockResolvedValue(row({ commission_type: null, commission_value: null, commission_starts_on: null }));
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
    expect(t.rpc.setTerms).not.toHaveBeenCalled();
  });

  it('the RPC refuses a past start for a new part and an earlier start for a saved one: 400 with the code', async () => {
    const put = (body: object) => t.call({ method: 'PUT', url: PUT, token: 'admin', body });
    for (const code of ['commission_start_in_past', 'commission_start_earlier', 'salary_start_in_past', 'salary_start_earlier']) {
      t.rpc.setTerms.mockRejectedValueOnce(badRequest(code));
      const res = await put({ commission: null, salary: SALARY });
      expect([res.statusCode, res.json().code]).toEqual([400, code]);
    }
    expect(t.audit.record).not.toHaveBeenCalled();
    expect(t.rpc.evaluate).not.toHaveBeenCalled();
  });

  it('an unknown assistant: 404 assistant_not_found, nothing written', async () => {
    t.terms.isAssistant.mockResolvedValue(false);
    const res = await t.call({ method: 'PUT', url: PUT, token: 'admin', body: { commission: null, salary: null } });
    expect([res.statusCode, res.json().code]).toEqual([404, 'assistant_not_found']);
    expect(t.rpc.setTerms).not.toHaveBeenCalled();
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
});
