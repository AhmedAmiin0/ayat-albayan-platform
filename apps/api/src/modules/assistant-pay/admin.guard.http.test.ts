import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, assistantApp, ID, STUDENT } from './assistant-pay.fakes';

type App = Awaited<ReturnType<typeof assistantApp>>;
type Route = { method: 'GET' | 'POST' | 'PUT'; url: string; body?: object };
const REASON = { reason: 'سبب واضح' };
const TERMS = { commission: { type: 'percent', value: 10, startsOn: '2026-10-01' }, salary: { amount: 1000, currency: 'SAR', startsOn: '2026-10-01' } };

/** Every admin route of the assistants' pay, with a body that passes validation: only the guard can refuse it. */
const ROUTES: Route[] = [
  { method: 'GET', url: '/assistant-pay/terms' },
  { method: 'GET', url: `/assistant-pay/terms/${A}` },
  { method: 'PUT', url: `/assistant-pay/terms/${A}`, body: TERMS },
  { method: 'GET', url: '/assistant-pay/commissions' },
  { method: 'POST', url: `/assistant-pay/commissions/${ID}/void`, body: REASON },
  { method: 'POST', url: '/assistant-pay/adjustments', body: { assistantId: A, amount: -50, currency: 'SAR', reason: 'خصم' } },
  { method: 'POST', url: '/assistant-pay/brought-by', body: { studentIds: [STUDENT], assistantId: A } },
  { method: 'GET', url: '/assistant-pay/statements' },
  { method: 'GET', url: `/assistant-pay/statements/${ID}` },
  { method: 'GET', url: `/assistant-pay/statements/${ID}/receipt` },
  { method: 'POST', url: '/assistant-pay/statements', body: { assistantId: A, month: '2026-10' } },
  { method: 'POST', url: `/assistant-pay/statements/${ID}/approve` },
  { method: 'POST', url: `/assistant-pay/statements/${ID}/reopen` },
  { method: 'POST', url: `/assistant-pay/statements/${ID}/pay`, body: {} },
  { method: 'POST', url: `/assistant-pay/statements/${ID}/unpay`, body: REASON },
  { method: 'POST', url: '/assistant-pay/receipt-upload-url', body: { assistantId: A, mime: 'application/pdf', size: 1000 } },
];

describe('/assistant-pay: the admin only (assistantpay.read | write | approve)', () => {
  let t: App;
  beforeAll(async () => {
    t = await assistantApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('every route: 403 for either assistant, a teacher, a classroom assistant and a guardian; nothing read or written', async () => {
    for (const route of ROUTES) {
      for (const token of ['salesA', 'salesB', 'teacher', 'ta', 'guardian'] as const) {
        const res = await t.call({ ...route, token });
        expect([route.method, route.url, token, res.statusCode]).toEqual([route.method, route.url, token, 403]);
      }
    }
    for (const fn of [...Object.values(t.rpc), ...Object.values(t.terms), ...Object.values(t.statements), ...Object.values(t.ledger), t.receipts.check, t.audit.record]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('every route: 401 without a token, and the admin passes the guard (anything but 401 / 403)', async () => {
    for (const route of ROUTES) {
      const anon = await t.app.inject({ method: route.method, url: route.url, payload: route.body });
      expect([route.url, anon.statusCode]).toEqual([route.url, 401]);
      const admin = await t.call({ ...route, token: 'admin' });
      expect([route.method, route.url, [401, 403].includes(admin.statusCode)]).toEqual([route.method, route.url, false]);
    }
  });

  it('the assistant portal does not open the admin ledger: the sales scope keys are not admin keys', async () => {
    for (const url of ['/sales/me/students', '/sales/me/earnings', '/sales/me/payments']) {
      expect((await t.call({ method: 'GET', url, token: 'admin' })).statusCode).toBe(403);
    }
  });
});
