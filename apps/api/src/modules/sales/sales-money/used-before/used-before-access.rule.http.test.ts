import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';
import { editApp, URL } from '@/modules/finance/subscriptions/used-before-edit/used-before-edit.test-util';

// «اشتراط التعيين» ON (resetMocks' enforced settings, SalesOwnershipRule): an assistant edits
// «حلقات مستخدمة من الباقة» on her own students' packages only; the admin is never bound.
describe('/subscriptions/:id/lessons-used-before while the ownership rule is enforced', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let edits: Awaited<ReturnType<typeof editApp>>['edits'];
  let call: Awaited<ReturnType<typeof editApp>>['call'];

  beforeAll(async () => ({ app, m, call, edits } = await editApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    edits.courseBooked.mockReset().mockResolvedValue(false);
    edits.setUsedBefore.mockReset().mockResolvedValue(subRow({ lessons_used_before: 1 }));
  });

  it('another assistant’s student → 403 not_your_student for GET and PATCH; nothing written', async () => {
    const body = { lessonsUsedBefore: 1 };
    for (const method of ['GET', 'PATCH'] as const) {
      const res = await call({ method, url: URL, token: 'salesB', ...(method === 'PATCH' ? { body } : {}) });
      expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    }
    expect(edits.courseBooked).not.toHaveBeenCalled();
    expect(edits.setUsedBefore).not.toHaveBeenCalled();
  });

  it('her own student → 200', async () => {
    const res = await call({ method: 'PATCH', url: URL, token: 'salesA', body: { lessonsUsedBefore: 1 } });
    expect(res.statusCode).toBe(200);
  });

  it('the system admin is never bound by the assistant rule', async () => {
    const res = await call({ method: 'GET', url: URL, token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(m.sales.ownership).not.toHaveBeenCalled();
  });
});
