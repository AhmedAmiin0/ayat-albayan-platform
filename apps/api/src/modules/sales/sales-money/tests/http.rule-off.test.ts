import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { SETTING_DEFAULTS } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import {
  moneyApp,
  resetMocks,
  SALES_B,
  type InjectArgs,
  type Mocks,
} from '@/modules/finance/subscriptions/test-app';
import { AUTO_ASSIGN_OFF, CREATE, FAMILY_PHONE, NONE, PAY } from './sales-money.fakes';
import { salesDefaults } from './sales-money.fakes';

// Owner 2026-11-02 (docs/16 row 39): «اشتراط التعيين» OFF (the default) or auto-assign OFF =
// the system sales role (no sales.renew_any) acts on ANY student. STUDENT_ID is salesA's; salesB
// owns nothing.
const WRITES: InjectArgs[] = [
  {
    method: 'POST',
    url: '/sales/subscriptions/quote',
    body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' } },
  },
  { method: 'POST', url: '/sales/subscriptions', body: CREATE },
  { method: 'POST', url: '/sales/payments', body: PAY },
  {
    method: 'POST',
    url: '/sales/payments/receipt-upload-url',
    body: { subscriptionId: SUB_ID, mime: 'image/jpeg', size: 1000 },
  },
  { method: 'GET', url: `/sales/money/chat-receipts?studentId=${STUDENT_ID}` },
];
const ALL_PASS = [200, 201, 201, 200, 200];
const REQUIRE_OFF = SETTING_DEFAULTS;

describe('the ownership rule off: any student’s money, as her, commission untouched', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.settings.all.mockResolvedValue(REQUIRE_OFF);
    const upload = { bucket: 'receipts', path: `${SUB_ID}/x.jpg`, token: 't' };
    m.storage.signedUpload.mockResolvedValue(upload);
    m.mediaQueries.receipts.mockResolvedValue([]);
  });

  const statuses = async () => {
    const out: number[] = [];
    for (const r of WRITES) out.push((await call({ ...r, token: 'salesB' })).statusCode);
    return out;
  };

  it.each([
    ['require off (the default)', REQUIRE_OFF],
    ['require on, auto-assign off', { ...AUTO_ASSIGN_OFF, sales_require_assignee: true }],
  ])('%s: a student assigned to nobody: quote, package, transfer, upload', async (_l, s) => {
    m.settings.all.mockResolvedValue(s);
    m.sales.ownership.mockResolvedValue(NONE);
    expect(await statuses()).toEqual(ALL_PASS);
    expect(m.sales.ownership).not.toHaveBeenCalled();
  });

  it('commission unchanged: recorded as her, brought_by (its key) never written', async () => {
    expect(await statuses()).toEqual(ALL_PASS);
    const present = expect.anything();
    const hers = expect.objectContaining({ recorded_by: SALES_B.id });
    expect(m.payments.insert).toHaveBeenCalledWith(hers);
    for (const insert of [m.subs.insert, m.payments.insert])
      expect(insert).toHaveBeenCalledWith(expect.not.objectContaining({ brought_by: present }));
  });

  it('her family view lists every child, each `mine` (she may act on it)', async () => {
    const child = { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'trial' };
    m.family.studentsOfPhone.mockResolvedValue([child]);
    m.subs.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const url = `/sales/money/family?phone=${encodeURIComponent(FAMILY_PHONE)}`;
    const res = await call({ method: 'GET', url, token: 'salesB' });
    const listed = expect.objectContaining({ id: STUDENT_ID, mine: true });
    expect(res.json().students).toEqual([listed]);
  });

  it('require on and auto-assign on: the same student is 403 not_your_student', async () => {
    m.settings.all.mockResolvedValue({ ...REQUIRE_OFF, sales_require_assignee: true });
    const res = await call({ ...WRITES[1], token: 'salesB' } as InjectArgs);
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('«إلغاء الباقة» of a student not hers: cancelled with her as the actor', async () => {
    const cancelled = subRow({ status: 'cancelled', cancelled_by: SALES_B.id });
    m.subs.get.mockReset().mockResolvedValueOnce(subRow()).mockResolvedValue(cancelled);
    m.cancels.cancel.mockResolvedValue({ row: cancelled });
    const url = `/sales/subscriptions/${SUB_ID}/cancel`;
    expect((await call({ method: 'POST', url, token: 'salesB', body: {} })).statusCode).toBe(200);
    const byHer = expect.objectContaining({ actorId: SALES_B.id });
    expect(m.cancels.cancel).toHaveBeenCalledWith(byHer);
  });
});
