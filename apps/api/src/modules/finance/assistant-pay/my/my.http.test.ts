import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, assistantApp, B, statementRow } from '../assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;
const ROUTES = ['/sales/me/students', '/sales/me/earnings', '/sales/me/payments'];
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];

/** A row of v_assistant_students / payments as a careless query could return it: with money and people the assistant must not get. */
const dirtyStudent = { student_id: 's1', code: 'AB-1001', name: 'ياسمين', brought_at: '2026-10-02T09:00:00Z', first_subscription_paid: true,
  commission_id: 'c1', commission_status: 'earned', commission_amount: 29, commission_currency: 'SAR', commission_earned_at: '2026-10-03T09:00:00Z',
  price: 290, guardian_id: 'g1', notes: 'سر', assistant_id: A };
const dirtyPayment = { id: 'p1', kind: 'payment', amount: 100, currency: 'SAR', method: 'bank', paid_at: '2026-10-03T08:00:00Z', note: 'دفعة',
  recorded_by: A, receipt_path: 'receipts/x', fx_rate: 3.75, subscription_id: 'sub-1',
  subscription: { price: 290, notes: 'سر', student: { id: 's1', code: 'AB-1001', name: 'ياسمين' } } };

describe('GET /sales/me/* (the assistant portal): who may call, and only ever my own rows', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.terms.renewalShare.mockResolvedValue(50);
    t.my.students.mockImplementation(async (id: string) => (id === A ? [dirtyStudent] : []));
    t.my.payments.mockImplementation(async (id: string) => (id === A ? [dirtyPayment] : []));
    t.my.tz.mockResolvedValue('Asia/Riyadh');
    t.my.commissions.mockResolvedValue([]);
    t.my.adjustments.mockResolvedValue([]);
    t.terms.get.mockResolvedValue(null);
    t.statements.list.mockResolvedValue([]);
  });

  it('403 for the admin, a teacher, a classroom assistant and a guardian on every route; nothing read', async () => {
    for (const token of ['admin', 'teacher', 'ta', 'guardian'] as const) {
      for (const url of ROUTES) expect([token, url, (await t.call({ method: 'GET', url, token })).statusCode]).toEqual([token, url, 403]);
    }
    expect(t.my.students).not.toHaveBeenCalled();
    expect(t.my.payments).not.toHaveBeenCalled();
    expect(t.statements.list).not.toHaveBeenCalled();
  });

  it('401 without a token', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/sales/me/students' });
    expect(res.statusCode).toBe(401);
  });

  it('students: rows are exactly id, code, name, brought_at, first_subscription_paid, commission; no price, guardian or notes', async () => {
    const res = await t.call({ method: 'GET', url: '/sales/me/students', token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.my.students).toHaveBeenCalledWith(A);
    const [row] = res.json();
    expect(Object.keys(row)).toEqual(['id', 'code', 'name', 'brought_at', 'first_subscription_paid', 'commission', 'renewal_commissions']);
    expect(Object.keys(row.commission)).toEqual(['amount', 'currency', 'status', 'earned_at']);
    expect(keys(res.json()).filter((k) => /price|fx_|notes|guardian|assistant|paid_amount|due/i.test(k))).toEqual([]);
    expect(res.body).not.toContain('290');
  });

  it('students: assistant B sees none of A (B id is the only one asked), whatever the query string says', async () => {
    const res = await t.call({ method: 'GET', url: `/sales/me/students?assistantId=${A}&assistant_id=${A}`, token: 'salesB' });
    expect(res.json()).toEqual([]);
    expect(t.my.students).toHaveBeenCalledWith(B);
    expect(t.my.students).not.toHaveBeenCalledWith(A);
  });

  it('payments: only the ones I recorded, rows are exactly id, student, kind, amount, currency, method, paid_at, note', async () => {
    const res = await t.call({ method: 'GET', url: `/sales/me/payments?recorded_by=${B}`, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.my.payments).toHaveBeenCalledTimes(1);
    expect(t.my.payments).toHaveBeenCalledWith(A);
    const [row] = res.json();
    expect(Object.keys(row)).toEqual(['id', 'student', 'kind', 'amount', 'currency', 'method', 'paid_at', 'note']);
    expect(row.student).toEqual({ id: 's1', code: 'AB-1001', name: 'ياسمين' });
    expect(keys(res.json()).filter((k) => /price|fx_|receipt|recorded_by|subscription|notes/i.test(k))).toEqual([]);
    expect(res.body).not.toContain('290');
  });

  it('payments: assistant B gets B rows only, never the payments A recorded', async () => {
    expect((await t.call({ method: 'GET', url: '/sales/me/payments', token: 'salesB' })).json()).toEqual([]);
    expect(t.my.payments).toHaveBeenCalledWith(B);
  });

  it('earnings: own terms, own statements without drafts; the receipt path and the actors never leave', async () => {
    t.statements.list.mockResolvedValue([statementRow({ status: 'paid', paid_at: '2026-11-02T00:00:00Z', method: 'bank', approved_at: '2026-11-01T00:00:00Z' })]);
    const res = await t.call({ method: 'GET', url: `/sales/me/earnings?assistantId=${B}`, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.terms.get).toHaveBeenCalledWith(A);
    expect(t.statements.list).toHaveBeenCalledWith({ assistantId: A, hideDrafts: true });
    const [s] = res.json().statements;
    expect(s).toMatchObject({ month: '2026-10-01', status: 'paid', has_receipt: true, totals: { SAR: { total: 1100 } } });
    expect(keys(res.json()).filter((k) => /receipt_path|approved_by|paid_by|created_by/.test(k))).toEqual([]);
    expect(res.body).not.toContain('secret.pdf');
  });

  it('earnings: B has no rows of A; this month is built from B terms only', async () => {
    const res = await t.call({ method: 'GET', url: '/sales/me/earnings', token: 'salesB' });
    expect(res.json()).toMatchObject({ terms: null, statements: [], commissions_total: {} });
    for (const fn of [t.my.tz, t.my.commissions, t.my.adjustments, t.terms.get]) expect(fn).toHaveBeenCalledWith(B);
    expect(t.statements.list).toHaveBeenCalledWith({ assistantId: B, hideDrafts: true });
  });
});
