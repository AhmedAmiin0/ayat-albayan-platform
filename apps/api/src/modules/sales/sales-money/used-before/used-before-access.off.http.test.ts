import { SETTING_DEFAULTS } from '@ab/shared';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { subRow } from '@/modules/finance/subscriptions/money/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';
import { editApp, URL } from '@/modules/finance/subscriptions/used-before-edit/used-before-edit.test-util';

// «اشتراط التعيين» OFF (SETTING_DEFAULTS, SalesOwnershipRule): an assistant with edit_terms edits
// «حلقات مستخدمة من الباقة» on ANY student's package (salesB owns none).
describe('/subscriptions/:id/lessons-used-before while the ownership rule is off', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let edits: Awaited<ReturnType<typeof editApp>>['edits'];
  let call: Awaited<ReturnType<typeof editApp>>['call'];

  beforeAll(async () => ({ app, m, call, edits } = await editApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.settings.all.mockResolvedValue(SETTING_DEFAULTS);
    edits.courseBooked.mockReset().mockResolvedValue(false);
    edits.setUsedBefore.mockReset().mockResolvedValue(subRow({ lessons_used_before: 1 }));
  });

  it('another assistant’s student → 200 for GET and PATCH; the edit is written', async () => {
    const body = { lessonsUsedBefore: 1 };
    for (const method of ['GET', 'PATCH'] as const) {
      const res = await call({ method, url: URL, token: 'salesB', ...(method === 'PATCH' ? { body } : {}) });
      expect(res.statusCode).toBe(200);
    }
    expect(edits.setUsedBefore).toHaveBeenCalledOnce();
  });
});
